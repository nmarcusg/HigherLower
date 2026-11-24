"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import AtmosphereBackdrop from "@/components/atmosphere/AtmosphereBackdrop";
import AudioSurface from "@/components/audio/AudioSurface";
import MaintenanceBanner from "./MaintenanceBanner";
import VisitTelemetry from "./VisitTelemetry";

/**
 * Splits public game chrome (atmosphere shader/grid backdrop, sound FX toggle,
 * maintenance banner, visit telemetry) from `/admin/*`, leaving Admin with a
 * clean workspace.
 */
export default function PublicChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <AtmosphereBackdrop />
      <MaintenanceBanner />
      {children}
      <VisitTelemetry />
      <AudioSurface />
    </>
  );
}
