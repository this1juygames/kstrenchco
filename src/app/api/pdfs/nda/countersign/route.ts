import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

export async function POST(request: Request) {
  try {
    const { docId, adminSignatureDataUrl } = await request.json();

    if (!docId) {
      return NextResponse.json({ error: "Document ID is required." }, { status: 400 });
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: adminProfile } = await supabase
      .from("profiles")
      .select("role, full_name, signature_data_url")
      .eq("id", user.id)
      .single();

    if (
      !adminProfile ||
      !["Admin", "Internal_Admin", "admin"].includes(adminProfile.role)
    ) {
      return NextResponse.json({ error: "Admin access required." }, { status: 403 });
    }

    const { data: doc, error: docErr } = await supabase
      .from("compliance_docs")
      .select("*")
      .eq("id", docId)
      .single();

    if (docErr || !doc) {
      return NextResponse.json({ error: "NDA document not found." }, { status: 404 });
    }

    // Download subcontractor's signed PDF from private storage
    const { data: fileBlob, error: dlErr } = await supabase.storage
      .from("compliance-files")
      .download(doc.file_path);

    if (dlErr || !fileBlob) {
      return NextResponse.json({ error: "Could not load signed NDA file." }, { status: 500 });
    }

    const existingBytes = await fileBlob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(existingBytes);
    const pages = pdfDoc.getPages();
    const page3 = pages[pages.length - 1];

    const sigToUse = adminSignatureDataUrl || adminProfile.signature_data_url;

    if (sigToUse) {
      const pngBase64 = sigToUse.replace(/^data:image\/png;base64,/, "");
      const sigImage = await pdfDoc.embedPng(Buffer.from(pngBase64, "base64"));
      page3.drawImage(sigImage, {
        x: 355,
        y: 476,
        width: 170,
        height: 44,
      });
    } else {
      const font = await pdfDoc.embedFont(StandardFonts.HelveticaBoldOblique);
      page3.drawText(adminProfile.full_name || "Authorized Officer", {
        x: 360,
        y: 486,
        size: 12,
        font,
        color: rgb(0.05, 0.08, 0.15),
      });
    }

    const countersignedBytes = await pdfDoc.save();

    const { error: uploadErr } = await supabase.storage
      .from("compliance-files")
      .upload(doc.file_path, countersignedBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadErr) throw uploadErr;

    const { error: approveErr } = await supabase
      .from("compliance_docs")
      .update({
        status: "Approved",
        rejection_reason: "",
      })
      .eq("id", doc.id);

    if (approveErr) throw approveErr;

    return NextResponse.json({ ok: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Countersign failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}