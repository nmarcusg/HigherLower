"use client";

import { useState, type FormEvent } from "react";
import { Flag, LoaderCircle } from "lucide-react";
import { reportPlayset } from "@/lib/backend/client";
import type { ReportReason } from "@/lib/backend/types";
import NativeModalDialog from "@/components/ui/NativeModalDialog";

const REASONS: ReadonlyArray<{ value: ReportReason; label: string; help: string }> = [
  { value: "OFFENSIVE", label: "Hate speech or harassment", help: "Slurs, abuse, or targeted attacks." },
  { value: "SEXUAL", label: "Explicit / NSFW content", help: "Inappropriate images or descriptions." },
  { value: "SPAM", label: "Spam or gibberish", help: "Broken entries, ads, or junk text." },
  { value: "MISLEADING", label: "Fake or intentionally wrong facts", help: "Bad numbers that break the game." },
  { value: "COPYRIGHT", label: "Unauthorized content", help: "Copyright or trademark violation." },
  { value: "OTHER", label: "Other issue", help: "Anything else moderators should review." },
];

export default function ReportPlaysetDialog({
  playsetId,
  playsetTitle,
  compact = false,
}: {
  playsetId: string;
  playsetTitle?: string | null;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason>("OFFENSIVE");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await reportPlayset(playsetId, { reason, details });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit your report.");
    } finally {
      setBusy(false);
    }
  }

  function handleClose() {
    setOpen(false);
    setError("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setSubmitted(false);
          setError("");
          setOpen(true);
        }}
        className={
          compact
            ? "inline-flex min-h-8 items-center gap-1.5 rounded-sm border border-white/15 bg-white/[0.03] px-2.5 text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)] transition hover:border-amber-300/50 hover:text-amber-200"
            : "inline-flex min-h-9 items-center gap-1.5 rounded-sm border border-white/20 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)] transition hover:border-amber-300/60 hover:text-amber-200"
        }
      >
        <Flag size={12} aria-hidden="true" />
        Report playset
      </button>

      <NativeModalDialog
        open={open}
        onClose={handleClose}
        eyebrow="Community Safety"
        title={playsetTitle ? `Report “${playsetTitle}”` : "Report this playset"}
      >
        {submitted ? (
          <div className="space-y-4">
            <p className="rounded-sm border border-emerald-400/35 bg-emerald-950/35 p-3 text-sm text-emerald-200">
              Thanks — your report has been queued for our moderation team. No account is needed.
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="min-h-10 rounded-sm bg-[var(--accent-highlight)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-[#15122b]"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
            <p className="text-xs leading-5 text-[var(--text-secondary)]">
              Let our moderators know why this custom playset should be reviewed.
            </p>

            <fieldset className="space-y-2">
              <legend className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
                Reason
              </legend>
              {REASONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex cursor-pointer items-start gap-2.5 rounded-sm border p-2.5 transition ${
                    reason === opt.value
                      ? "border-[var(--accent-highlight)] bg-[var(--accent-highlight)]/10"
                      : "border-white/15 hover:border-white/30"
                  }`}
                >
                  <input
                    type="radio"
                    name="report-reason"
                    value={opt.value}
                    checked={reason === opt.value}
                    onChange={() => setReason(opt.value)}
                    className="mt-1 accent-[var(--accent-highlight)]"
                  />
                  <span>
                    <span className="block text-xs font-bold text-white">{opt.label}</span>
                    <span className="block text-[11px] text-[var(--text-muted)]">{opt.help}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <label className="block text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--text-muted)]">
              Optional details (max 500 chars)
              <textarea
                value={details}
                maxLength={500}
                onChange={(e) => setDetails(e.target.value)}
                rows={3}
                placeholder="Tell us which items or images are problematic…"
                className="mt-1.5 w-full rounded-sm border border-white/20 bg-[#121024] p-2.5 text-sm font-normal text-white outline-none focus:border-[var(--focus-ring)]"
              />
            </label>

            {error && (
              <p role="alert" className="rounded-sm border border-red-400/40 bg-red-950/35 p-2.5 text-xs text-red-200">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={busy}
                className="min-h-10 rounded-sm border border-white/25 px-4 text-xs font-bold uppercase tracking-[0.1em] text-white hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-10 items-center gap-2 rounded-sm bg-[var(--accent-time-attack)] px-4 text-xs font-bold uppercase tracking-[0.1em] text-white hover:brightness-110 disabled:opacity-50"
              >
                {busy && <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />}
                Submit report
              </button>
            </div>
          </form>
        )}
      </NativeModalDialog>
    </>
  );
}
