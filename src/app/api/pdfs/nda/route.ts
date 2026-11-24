import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import fs from "fs/promises";
import path from "path";

export async function POST(request: Request) {
  try {
    const { signerName, signatureDataUrl } = await request.json();

    if (!signerName?.trim() || !signatureDataUrl) {
      return NextResponse.json(
        { error: "Signer name and signature are required." },
        { status: 400 }
      );
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("org_id")
      .eq("id", user.id)
      .single();

    if (!profile?.org_id) {
      return NextResponse.json({ error: "Organization not found" }, { status: 400 });
    }

    const templatePath = path.join(
      process.cwd(),
      "public",
      "templates",
      "confidentiality-agreement.pdf"
    );

    let templateBytes: Buffer;
    try {
      templateBytes = await fs.readFile(templatePath);
    } catch {
      return NextResponse.json(
        {
          error:
            "Missing template file: public/templates/confidentiality-agreement.pdf",
        },
        { status: 500 }
      );
    }

    const pdfDoc = await PDFDocument.load(templateBytes);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const pages = pdfDoc.getPages();

    const now = new Date();
    const day = now.getDate();
    const month = now.toLocaleString("en-US", { month: "long" });
    const year = String(now.getFullYear());

    const page1 = pages[0];
    page1.drawText(signerName.trim(), {
      x: 115,
      y: 678,
      size: 11,
      font,
      color: rgb(0.05, 0.08, 0.15),
    });

    const page3 = pages[pages.length - 1];
    page3.drawText(String(day), { x: 245, y: 557, size: 10, font });
    page3.drawText(month, { x: 315, y: 557, size: 10, font });
    page3.drawText(year, { x: 425, y: 557, size: 10, font });

    const pngBase64 = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
    const sigImage = await pdfDoc.embedPng(Buffer.from(pngBase64, "base64"));
    page3.drawImage(sigImage, {
      x: 72,
      y: 492,
      width: 180,
      height: 48,
    });

    const finalPdfBytes = await pdfDoc.save();
    const filePath = `${profile.org_id}/nda_${Date.now()}.pdf`;

    const { error: uploadError } = await supabase.storage
      .from("compliance-files")
      .upload(filePath, finalPdfBytes, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: existing } = await supabase
      .from("compliance_docs")
      .select("id")
      .eq("org_id", profile.org_id)
      .in("doc_type", ["NDA", "Confidentiality Agreement"])
      .maybeSingle();

    if (existing) {
      const { error: updateErr } = await supabase
        .from("compliance_docs")
        .update({
          doc_type: "NDA",
          file_path: filePath,
          status: "Pending",
          rejection_reason: "",
        })
        .eq("id", existing.id);
      if (updateErr) throw updateErr;
    } else {
      const { error: insertErr } = await supabase.from("compliance_docs").insert({
        org_id: profile.org_id,
        doc_type: "NDA",
        file_path: filePath,
        status: "Pending",
        rejection_reason: "",
      });
      if (insertErr) throw insertErr;
    }

    return NextResponse.json({ ok: true, filePath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate NDA PDF.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
