import type { ReactNode } from "react";

export default function StudioLayout({ children }: { children: ReactNode }) {
  return <div className="ui-scale-120">{children}</div>;
}
