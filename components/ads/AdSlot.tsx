"use client";

import { useEffect, useState } from "react";
import { fetchPublicSettings } from "@/lib/backend/publicSettings";
import { getSupabaseBrowserClient } from "@/lib/backend/creator";
import { getDeviceId } from "@/lib/device";

export type AdSlotName = "home_banner" | "lobby_sidebar" | "postgame_card";

let cachedAdExempt: { token: string; exempt: boolean; expiresAt: number } | null = null;

async function isAdExemptUser(): Promise<boolean> {
  const supabase = getSupabaseBrowserClient();
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) return false;

  if (cachedAdExempt && cachedAdExempt.token === token && cachedAdExempt.expiresAt > Date.now()) {
    return cachedAdExempt.exempt;
  }

  try {
    const deviceId = getDeviceId();
    const res = await fetch("/api/backend/me/profile", {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return false;
    const profile = (await res.json()) as { tier?: string; isStaff?: boolean };
    const exempt = profile.tier === "PRO" || profile.isStaff === true;
    cachedAdExempt = { token, exempt, expiresAt: Date.now() + 60_000 };
    return exempt;
  } catch {
    return false;
  }
}

/**
 * Config-gated ad slot container. Stays unmounted whenever ads are globally off,
 * the specific slot is disabled in Admin Settings, or the visitor is signed in as
 * Creator Pro or Staff. Never placed next to active Higher/Lower choice controls.
 */
export default function AdSlot({
  slot,
  className = "",
}: {
  slot: AdSlotName;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchPublicSettings(), isAdExemptUser()]).then(([settings, exempt]) => {
      if (!active) return;
      setVisible(settings.ads.enabled && settings.ads.slots[slot] && !exempt);
    });
    return () => {
      active = false;
    };
  }, [slot]);

  if (!visible) return null;

  return (
    <aside
      aria-label="Advertisement"
      data-ad-slot={slot}
      className={`mx-auto flex min-h-24 w-full max-w-3xl flex-col items-center justify-center rounded-sm border border-white/10 bg-[#141129]/80 px-4 py-3 text-center ${className}`}
    >
      <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)]">
        Advertisement
      </span>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Sponsored slot ({slot.replace(/_/g, " ")}) — Creator Pro removes all ads.
      </p>
    </aside>
  );
}
