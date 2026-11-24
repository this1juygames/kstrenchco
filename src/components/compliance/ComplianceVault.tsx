"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import SignaturePad from "@/components/ui/SignaturePad";

type ComplianceDoc = {
  id: string;
  org_id: string;
  doc_type: string;
  file_path: string;
  expiration_date: string | null;
  status: "Pending" | "Approved" | "Rejected" | "Expired" | string;
  rejection_reason?: string | null;
};

type RequiredDocConfig = {
  key: "W-9" | "COI" | "License" | "NDA";
  matchTypes: string[];
  title: string;
  description: string;
  requiresExpiration: boolean;
  isDigitalNda?: boolean;
};

const REQUIRED_DOCS: RequiredDocConfig[] = [
  {
    key: "W-9",
    matchTypes: ["W-9", "W9"],
    title: "IRS Form W-9",
    description: "Signed current-year Request for Taxpayer Identification Number.",
    requiresExpiration: false,
  },
  {
    key: "COI",
    matchTypes: ["COI", "General Liability COI", "Insurance"],
    title: "General Liability COI",
    description: "Certificate of Insurance naming K.S. Trenchco as Certificate Holder.",
    requiresExpiration: true,
  },
  {
    key: "License",
    matchTypes: ["License", "Trade License"],
    title: "Contractor / Trade License",
    description: "Active state utility, excavation, or directional boring license.",
    requiresExpiration: true,
  },
  {
    key: "NDA",
    matchTypes: ["NDA", "Confidentiality Agreement"],
    title: "Confidentiality Agreement (NDA)",
    description: "Review and sign K.S. Trenchco, LLC's Confidentiality Agreement online.",
    requiresExpiration: false,
    isDigitalNda: true,
  },
];

export default function ComplianceVault({ orgId }: { orgId: string }) {
  const supabase = createClient();

  const [docs, setDocs] = useState<ComplianceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [previewingKey, setPreviewingKey] = useState<string | null>(null);
  const [expDates, setExpDates] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ type: "error" | "success"; text: string } | null>(
    null
  );

  const [showNdaModal, setShowNdaModal] = useState(false);
  const [ndaSignerName, setNdaSignerName] = useState("");
  const [ndaSignature, setNdaSignature] = useState<string | null>(null);
  const [submittingNda, setSubmittingNda] = useState(false);

  const fetchDocs = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("compliance_docs")
      .select("*")
      .eq("org_id", orgId);

    if (!error && data) {
      setDocs(data as ComplianceDoc[]);
      const initialDates: Record<string, string> = {};
      for (const req of REQUIRED_DOCS) {
        const found = (data as ComplianceDoc[]).find((d) => req.matchTypes.includes(d.doc_type));
        if (found?.expiration_date) {
          initialDates[req.key] = found.expiration_date;
        }
      }
      setExpDates((prev) => ({ ...initialDates, ...prev }));
    }
    setLoading(false);
  }, [orgId, supabase]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  function getDocForConfig(config: RequiredDocConfig): ComplianceDoc | undefined {
    return docs.find((d) => config.matchTypes.includes(d.doc_type));
  }

  function isExpired(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    const today = new Date().toISOString().split("T")[0];
    return dateStr < today;
  }

  function isExpiringSoon(dateStr: string | null | undefined): boolean {
    if (!dateStr) return false;
    const today = new Date();
    const exp = new Date(dateStr + "T00:00:00");
    const diffDays = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 30;
  }

  const evaluated = REQUIRED_DOCS.map((req) => {
    const doc = getDocForConfig(req);
    const expired = doc ? isExpired(doc.expiration_date) : false;
    const expiringSoon = doc ? isExpiringSoon(doc.expiration_date) : false;
    const effectiveStatus = !doc ? "Missing" : expired ? "Expired" : doc.status;
    return { req, doc, effectiveStatus, expiringSoon };
  });

  const actionNeededItems = evaluated.filter((item) => item.effectiveStatus !== "Approved");
  const expiringSoonItems = evaluated.filter(
    (item) => item.effectiveStatus === "Approved" && item.expiringSoon
  );

  const healthState: "green" | "amber" | "red" =
    actionNeededItems.length > 0
      ? "red"
      : expiringSoonItems.length > 0
      ? "amber"
      : "green";

  async function handleUpload(config: RequiredDocConfig, file: File | undefined) {
    if (!file || !orgId) return;
    setFeedback(null);

    const chosenExp = expDates[config.key] || null;
    if (config.requiresExpiration && !chosenExp) {
      setFeedback({
        type: "error",
        text: `Please enter the expiration date for ${config.title} before uploading.`,
      });
      return;
    }

    setUploadingKey(config.key);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
      const cleanKey = config.key.toLowerCase().replace(/[^a-z0-9]/g, "");
      const filePath = `${orgId}/${cleanKey}_${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("compliance-files")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const existing = getDocForConfig(config);

      if (existing) {
        const { error: updateError } = await supabase
          .from("compliance_docs")
          .update({
            doc_type: config.key,
            file_path: filePath,
            expiration_date: chosenExp,
            status: "Pending",
            rejection_reason: "",
          })
          .eq("id", existing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from("compliance_docs").insert({
          org_id: orgId,
          doc_type: config.key,
          file_path: filePath,
          expiration_date: chosenExp,
          status: "Pending",
          rejection_reason: "",
        });

        if (insertError) throw insertError;
      }

      setFeedback({
        type: "success",
        text: `${config.title} uploaded and sent to K.S. Trenchco for review.`,
      });
      await fetchDocs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Upload failed.";
      setFeedback({ type: "error", text: message });
    } finally {
      setUploadingKey(null);
    }
  }

  async function handleNdaSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!ndaSignerName.trim() || !ndaSignature) {
      setFeedback({
        type: "error",
        text: "Please type your full legal name and sign inside the signature box.",
      });
      return;
    }

    setSubmittingNda(true);
    setFeedback(null);

    try {
      const res = await fetch("/api/pdfs/nda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          signerName: ndaSignerName.trim(),
          signatureDataUrl: ndaSignature,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not sign NDA.");

      setShowNdaModal(false);
      setNdaSignature(null);
      setFeedback({
        type: "success",
        text: "Confidentiality Agreement signed and stamped onto K.S. Trenchco's official PDF.",
      });
      await fetchDocs();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "NDA submission failed.";
      setFeedback({ type: "error", text: message });
    } finally {
      setSubmittingNda(false);
    }
  }

  async function handlePreview(config: RequiredDocConfig, filePath: string) {
    setPreviewingKey(config.key);
    setFeedback(null);

    const { data, error } = await supabase.storage
      .from("compliance-files")
      .createSignedUrl(filePath, 60);

    setPreviewingKey(null);

    if (error || !data?.signedUrl) {
      setFeedback({
        type: "error",
        text: "Could not generate a secure preview link. Please try again.",
      });
      return;
    }

    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  if (loading) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-6 text-slate-500 text-sm">
        Loading compliance vault...
      </div>
    );
  }

  return (
    <section className="space-y-5">
      {healthState === "green" && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/30 p-4 sm:p-5">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-emerald-600">
            All Clear • Verified Subcontractor
          </span>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            All 4 compliance documents are approved and active.
          </h2>
          <p className="text-sm text-slate-600">
            You are cleared to bid on open K.S. Trenchco jobs and submit daily reports.
          </p>
        </div>
      )}

      {healthState === "amber" && (
        <div className="rounded-2xl bg-amber-500/10 border border-amber-500/40 p-4 sm:p-5">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-amber-700">
            Expiring Soon • Action Recommended
          </span>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            {expiringSoonItems.map((i) => i.req.title).join(", ")} expires within 30 days.
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Upload your renewed certificate before expiration to avoid a hold on bidding or payouts.
          </p>
        </div>
      )}

      {healthState === "red" && (
        <div className="rounded-2xl bg-red-500/10 border border-red-500/40 p-4 sm:p-5">
          <span className="inline-block text-xs font-bold uppercase tracking-wider text-red-600">
            Action Required • Bidding & Payouts Held
          </span>
          <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
            {actionNeededItems.length} required{" "}
            {actionNeededItems.length === 1 ? "document needs" : "documents need"} attention
          </h2>
          <p className="text-sm text-slate-600 mt-0.5">
            Needs approval:{" "}
            {actionNeededItems
              .map((i) => `${i.req.title} (${i.effectiveStatus})`)
              .join(" • ")}
          </p>
        </div>
      )}

      {feedback && (
        <div
          className={`rounded-xl p-3.5 text-sm border ${
            feedback.type === "error"
              ? "bg-red-50 border-red-200 text-red-700"
              : "bg-emerald-50 border-emerald-200 text-emerald-700"
          }`}
        >
          {feedback.text}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {evaluated.map(({ req, doc, effectiveStatus, expiringSoon }) => {
          const badgeStyle =
            effectiveStatus === "Approved"
              ? expiringSoon
                ? "bg-amber-100 text-amber-800 border-amber-300"
                : "bg-emerald-100 text-emerald-800 border-emerald-300"
              : effectiveStatus === "Pending"
              ? "bg-sky-100 text-sky-800 border-sky-300"
              : "bg-red-100 text-red-800 border-red-300";

          return (
            <div
              key={req.key}
              className="rounded-2xl bg-white border border-slate-200 p-5 shadow-xs flex flex-col justify-between gap-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-bold text-slate-900">{req.title}</h3>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeStyle}`}
                  >
                    {effectiveStatus === "Pending" ? "Pending Review" : effectiveStatus}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">{req.description}</p>

                {effectiveStatus === "Rejected" && doc?.rejection_reason && (
                  <div className="rounded-xl bg-red-50 border border-red-200 p-3 text-xs text-red-800">
                    <span className="font-semibold text-red-900 block mb-0.5">
                      Admin Note:
                    </span>
                    {doc.rejection_reason}
                  </div>
                )}

                {req.requiresExpiration && (
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Expiration Date
                    </label>
                    <input
                      type="date"
                      value={expDates[req.key] || ""}
                      onChange={(e) =>
                        setExpDates((prev) => ({ ...prev, [req.key]: e.target.value }))
                      }
                      className="w-full min-h-[44px] rounded-xl bg-slate-50 border border-slate-300 px-3 text-sm text-slate-900 focus:outline-none focus:border-blue-600"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100">
                {doc?.file_path && (
                  <button
                    type="button"
                    onClick={() => handlePreview(req, doc.file_path)}
                    disabled={previewingKey === req.key}
                    className="w-full min-h-[44px] rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-sm font-medium transition"
                  >
                    {previewingKey === req.key
                      ? "Generating Secure Link..."
                      : req.isDigitalNda
                      ? "Preview Signed NDA PDF"
                      : "Preview Uploaded File"}
                  </button>
                )}

                {req.isDigitalNda ? (
                  <button
                    type="button"
                    onClick={() => setShowNdaModal(true)}
                    className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition"
                  >
                    {doc ? "Re-Sign Confidentiality Agreement" : "Review & Sign NDA"}
                  </button>
                ) : (
                  <label className="w-full min-h-[44px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold flex items-center justify-center cursor-pointer transition">
                    {uploadingKey === req.key
                      ? "Uploading..."
                      : doc
                      ? "Replace Document"
                      : "Upload PDF / Photo"}
                    <input
                      type="file"
                      accept=".pdf,image/*"
                      disabled={uploadingKey === req.key}
                      onChange={(e) => {
                        handleUpload(req, e.target.files?.[0]);
                        e.target.value = "";
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showNdaModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl p-5 sm:p-6 space-y-4 my-8 text-slate-100">
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 pb-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                  KS Trenchco, LLC
                </p>
                <h3 className="text-xl font-bold text-white">Confidentiality Agreement</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowNdaModal(false)}
                className="text-slate-400 hover:text-white text-sm font-semibold px-2 py-1"
              >
                Close ✕
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto rounded-xl bg-slate-950 border border-slate-800 p-4 text-xs text-slate-300 space-y-2.5 leading-relaxed">
              <p>
                This Confidentiality Agreement is made by and between{" "}
                <strong className="text-white">KS Trenchco, LLC (&ldquo;KS Trenchco&rdquo;)</strong>{" "}
                and the undersigned (&ldquo;Employee / Contractor&rdquo;).
              </p>
              <p>
                <strong className="text-white">1. Confidential Information:</strong> Includes
                manufacturing processes and methods, know-how techniques, computer programs and
                machines, software, costs, purchasing, operating procedures and systems, pricing,
                customer lists, sales data, R&amp;D, and future production/marketing information.
              </p>
              <p>
                <strong className="text-white">2. Non-Disclosure:</strong> Undersigned will protect
                and safeguard all Confidential Information against unauthorized publication or
                disclosure.
              </p>
              <p>
                <strong className="text-white">3. Authorized Use Only:</strong> Undersigned will not
                use any Confidential Information except for purposes authorized by KS Trenchco.
              </p>
              <p>
                <strong className="text-white">4. Return of Materials:</strong> All documents,
                notes, programs, and data must be returned upon termination of work with KS
                Trenchco.
              </p>
              <p>
                <strong className="text-white">5–9. Remedies &amp; Governing Law:</strong> Breach
                entitles KS Trenchco to immediate injunctive relief. Governed by the laws of North
                and South Carolina. Constitutes the entire agreement between the parties.
              </p>
            </div>

            <form onSubmit={handleNdaSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Legal Name (or Authorized Company Representative)
                </label>
                <input
                  type="text"
                  required
                  value={ndaSignerName}
                  onChange={(e) => setNdaSignerName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                />
              </div>

              <SignaturePad
                label="Draw Signature (Auto-stamped onto K.S. Trenchco's official PDF)"
                value={ndaSignature}
                onChange={setNdaSignature}
              />

              <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="submit"
                  disabled={submittingNda}
                  className="flex-1 min-h-[46px] rounded-xl bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                >
                  {submittingNda ? "Generating Signed PDF..." : "Sign & Submit NDA"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNdaModal(false)}
                  className="min-h-[46px] px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
