"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createBrowserClient } from "@supabase/ssr";

type QueueItem = {
  id: string;
  org_id: string;
  doc_type: string;
  file_path: string;
  expiration_date: string | null;
  status: string;
  rejection_reason: string | null;
  created_at?: string;
  organizations: {
    id: string;
    name: string;
    contact_email: string | null;
  } | null;
};

export default function AdminComplianceQueuePage() {
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [items, setItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<"Pending" | "All">("Pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const [expDate, setExpDate] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoadingList(true);
    let query = supabase
      .from("compliance_docs")
      .select("*, organizations(id, name, contact_email)")
      .order("id", { ascending: false });

    if (filter === "Pending") {
      query = query.eq("status", "Pending");
    }

    const { data, error } = await query;
    if (!error && data) {
      const typed = data as unknown as QueueItem[];
      setItems(typed);
      if (typed.length > 0 && !typed.some((i) => i.id === selectedId)) {
        setSelectedId(typed[0].id);
      } else if (typed.length === 0) {
        setSelectedId(null);
        setSignedUrl(null);
      }
    }
    setLoadingList(false);
  }, [filter, selectedId, supabase]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  const selectedItem = items.find((i) => i.id === selectedId) || null;

  useEffect(() => {
    async function loadDocumentPreview() {
      if (!selectedItem) {
        setSignedUrl(null);
        return;
      }

      setExpDate(selectedItem.expiration_date || "");
      setRejectReason(selectedItem.rejection_reason || "");
      setShowRejectBox(false);
      setLoadingPreview(true);

      const { data } = await supabase.storage
        .from("compliance-files")
        .createSignedUrl(selectedItem.file_path, 300);

      setSignedUrl(data?.signedUrl || null);
      setLoadingPreview(false);
    }

    loadDocumentPreview();
  }, [selectedItem, supabase]);

  async function handleDecision(decision: "Approved" | "Rejected") {
    if (!selectedItem) return;
    if (decision === "Rejected" && !rejectReason.trim()) {
      setToast("Please enter a short reason so the subcontractor knows what to fix.");
      return;
    }

    setSaving(true);
    setToast(null);

    const { error } = await supabase
      .from("compliance_docs")
      .update({
        status: decision,
        expiration_date: expDate || null,
        rejection_reason: decision === "Rejected" ? rejectReason.trim() : "",
      })
      .eq("id", selectedItem.id);

    setSaving(false);

    if (error) {
      setToast(`Error: ${error.message}`);
      return;
    }

    setToast(
      decision === "Approved"
        ? `Approved ${selectedItem.doc_type} for ${selectedItem.organizations?.name || "Subcontractor"}.`
        : `Rejected ${selectedItem.doc_type} and notified subcontractor.`
    );
    setShowRejectBox(false);
    await loadQueue();
  }

  const isImage = selectedItem?.file_path.match(/\.(jpg|jpeg|png|webp|gif)$/i);

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Admin Command Center
            </p>
            <h1 className="text-2xl font-bold text-white">Compliance Review Queue</h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/subcontractors"
              className="min-h-[40px] px-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-500 text-sm font-medium flex items-center"
            >
              ← Subcontractor Directory
            </Link>

            <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setFilter("Pending")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === "Pending"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Pending Queue
              </button>
              <button
                type="button"
                onClick={() => setFilter("All")}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                  filter === "All"
                    ? "bg-amber-500 text-slate-950"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                All Uploads
              </button>
            </div>
          </div>
        </div>

        {toast && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-sm text-amber-200">
            {toast}
          </div>
        )}

        {/* Split-Screen Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT PANEL: Queue List */}
          <div className="lg:col-span-4 space-y-2.5">
            {loadingList ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 text-sm text-slate-400">
                Loading queue...
              </div>
            ) : items.length === 0 ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 text-center space-y-1">
                <p className="text-base font-semibold text-white">Queue All Clear</p>
                <p className="text-xs text-slate-400">
                  No documents waiting for review right now.
                </p>
              </div>
            ) : (
              items.map((item) => {
                const active = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full text-left rounded-2xl p-4 border transition ${
                      active
                        ? "bg-slate-900 border-amber-500 shadow-lg"
                        : "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm truncate">
                        {item.organizations?.name || "Subcontractor"}
                      </span>
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                          item.status === "Approved"
                            ? "bg-emerald-500/15 text-emerald-300"
                            : item.status === "Rejected"
                            ? "bg-red-500/15 text-red-300"
                            : "bg-sky-500/15 text-sky-300"
                        }`}
                      >
                        {item.status}
                      </span>
                    </div>
                    <p className="text-xs text-amber-400 font-medium mt-1">{item.doc_type}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.expiration_date
                        ? `Expires: ${item.expiration_date}`
                        : "No expiration date set"}
                    </p>
                  </button>
                );
              })
            )}
          </div>

          {/* RIGHT PANEL: Embedded Viewer + Controls */}
          <div className="lg:col-span-8">
            {!selectedItem ? (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-10 text-center text-sm text-slate-400">
                Select a document on the left to inspect and approve.
              </div>
            ) : (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-800 pb-3">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedItem.organizations?.name} — {selectedItem.doc_type}
                    </h2>
                    <p className="text-xs text-slate-400">
                      {selectedItem.organizations?.contact_email}
                    </p>
                  </div>
                  {signedUrl && (
                    <a
                      href={signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-amber-400 hover:underline"
                    >
                      Open Fullscreen ↗
                    </a>
                  )}
                </div>

                {/* Embedded Document Viewer */}
                <div className="w-full h-[420px] sm:h-[500px] rounded-xl bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                  {loadingPreview ? (
                    <p className="text-sm text-slate-400">Loading secure document preview...</p>
                  ) : !signedUrl ? (
                    <p className="text-sm text-red-300">Unable to load document preview.</p>
                  ) : isImage ? (
                    <img
                      src={signedUrl}
                      alt={selectedItem.doc_type}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : (
                    <iframe
                      src={signedUrl}
                      title={selectedItem.doc_type}
                      className="w-full h-full border-0"
                    />
                  )}
                </div>

                {/* Expiration Date + Approve / Reject Controls */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Expiration Date (COI / License)
                    </label>
                    <input
                      type="date"
                      value={expDate}
                      onChange={(e) => setExpDate(e.target.value)}
                      className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-slate-700 px-3 text-sm text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleDecision("Approved")}
                    className="min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-sm transition"
                  >
                    {saving ? "Saving..." : "Approve Document ✓"}
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setShowRejectBox((prev) => !prev)}
                    className="min-h-[44px] rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/40 text-red-300 font-semibold text-sm transition"
                  >
                    Reject Document ✕
                  </button>
                </div>

                {/* Rejection Reason Drawer */}
                {showRejectBox && (
                  <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 space-y-3">
                    <label className="block text-xs font-semibold text-red-200">
                      Reason for Rejection (shown directly to the subcontractor)
                    </label>
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="e.g., COI expired or missing K.S. Trenchco as Certificate Holder"
                      className="w-full min-h-[44px] rounded-xl bg-slate-950 border border-red-500/40 px-3 text-sm text-white placeholder-slate-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => handleDecision("Rejected")}
                      className="min-h-[42px] px-5 rounded-xl bg-red-500 hover:bg-red-400 text-white font-semibold text-sm transition"
                    >
                      Confirm Rejection
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}