import type { ReactNode } from "react";

export default function MultiplayerLayout({ children }: { children: ReactNode }) {
  return <div className="ui-scale-120">{children}</div>;
}
