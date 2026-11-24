"use client";

import { Lock } from "lucide-react";

const BADGE_STYLES: Record<string, string> = {
  // Greens — approved, healthy, active, completed
  APPROVED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  PUBLISHED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  SUPPORTED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  COMPLETED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  RESOLVED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  ACTIVE: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  ENABLED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  READY: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  RUNNING: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  QUESTION: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  REVEAL: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",
  SUCCEEDED: "border-emerald-400/35 bg-emerald-500/15 text-emerald-300",

  // Ambers — hidden, degraded, warning, unlisted, unmatched, publish ban
  HIDDEN: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  DEGRADED: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  UNMATCHED: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  UNLISTED: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  PUBLISH_BAN: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  FINALIZING: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  COUNTDOWN: "border-amber-400/40 bg-amber-500/15 text-amber-200",
  PAUSED: "border-amber-400/40 bg-amber-500/15 text-amber-200",

  // Reds — removed, open reports, unavailable, failed, suspended, cancelled, revoked
  REMOVED: "border-red-400/45 bg-red-500/20 text-red-200",
  OPEN: "border-red-400/45 bg-red-500/20 text-red-200",
  UNAVAILABLE: "border-red-400/45 bg-red-500/20 text-red-200",
  SUSPENDED: "border-red-400/45 bg-red-500/20 text-red-200",
  FAILED: "border-red-400/45 bg-red-500/20 text-red-200",
  REFUNDED: "border-red-400/45 bg-red-500/20 text-red-200",
  CANCELLED: "border-red-400/45 bg-red-500/20 text-red-200",
  REVOKED: "border-red-400/45 bg-red-500/20 text-red-200",

  // Skies / Cyans — public, unreviewed, lobby, admin, pending
  UNREVIEWED: "border-sky-400/35 bg-sky-500/15 text-sky-200",
  PUBLIC: "border-cyan-400/35 bg-cyan-500/15 text-cyan-200",
  LOBBY: "border-sky-400/35 bg-sky-500/15 text-sky-200",
  PENDING: "border-sky-400/35 bg-sky-500/15 text-sky-200",
  ADMIN: "border-cyan-400/45 bg-cyan-500/15 text-[var(--accent-action-higher)]",

  // Purples / Indigos — moderator, archived, private
  MODERATOR: "border-violet-400/40 bg-violet-500/15 text-violet-200",
  ARCHIVED: "border-purple-400/35 bg-purple-500/15 text-purple-200",

  // Gold highlights — superadmin, pro, protected
  SUPERADMIN:
    "border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]",
  PRO: "border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]",
  PROTECTED:
    "border-[var(--accent-highlight)]/50 bg-[var(--accent-highlight)]/15 text-[var(--accent-highlight)]",

  // Neutral slates — draft, private, free, dismissed, finished, offline
  DRAFT: "border-white/20 bg-white/10 text-white/75",
  PRIVATE: "border-white/20 bg-white/10 text-white/75",
  FREE: "border-white/20 bg-white/10 text-white/80",
  DISMISSED: "border-white/20 bg-white/10 text-white/70",
  FINISHED: "border-white/20 bg-white/10 text-white/80",
  NEVER: "border-white/20 bg-white/10 text-white/70",
  DISABLED: "border-white/20 bg-white/10 text-white/70",
};

export default function StatusBadge({
  value,
  label,
  className = "",
  lockIcon = false,
}: {
  value: string;
  label?: string;
  className?: string;
  lockIcon?: boolean;
}) {
  const key = value.trim().toUpperCase();
  const tone = BADGE_STYLES[key] ?? "border-white/20 bg-white/10 text-white/80";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] whitespace-nowrap ${tone} ${className}`}
    >
      {lockIcon && <Lock size={10} aria-hidden="true" />}
      {label ?? value}
    </span>
  );
}
