"use client";

import { useEffect } from "react";
import { getDeviceId } from "@/lib/device";

const VISIT_KEY = "higher-lower:visit-day:v1";

/**
 * Records at most one privacy-safe daily visit ping per browser UTC day so the
 * Admin Console tracks deduplicated Visitors vs. Creators without cookies.
 */
export default function VisitTelemetry() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const utcDay = new Date().toISOString().slice(0, 10);
    try {
      if (window.localStorage.getItem(VISIT_KEY) === utcDay) return;
      window.localStorage.setItem(VISIT_KEY, utcDay);
    } catch {
      // Storage blocked; still send one mount ping best-effort.
    }

    const deviceId = getDeviceId();
    void fetch("/api/backend/telemetry/visit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(deviceId ? { "X-Device-Id": deviceId } : {}),
      },
      body: JSON.stringify(deviceId ? { deviceId } : {}),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
