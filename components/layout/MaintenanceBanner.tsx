"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { fetchPublicSettings } from "@/lib/backend/publicSettings";

export default function MaintenanceBanner() {
  const [banner, setBanner] = useState("");
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    let active = true;
    void fetchPublicSettings().then((settings) => {
      if (active && settings.maintenanceBanner.trim()) {
        setBanner(settings.maintenanceBanner.trim());
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (!banner || dismissed) return null;

  return (
    <div
      role="status"
      className="relative z-40 border-b border-[var(--accent-highlight)]/40 bg-[#271f13] px-4 py-2.5 text-center text-xs font-semibold text-amber-100"
    >
      <div className="mx-auto flex max-w-5xl items-center justify-center gap-3 pr-7">
        <AlertTriangle size={15} className="shrink-0 text-[var(--accent-highlight)]" aria-hidden="true" />
        <span>{banner}</span>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss notice"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm p-1 text-amber-200/80 transition hover:text-white"
      >
        <X size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
