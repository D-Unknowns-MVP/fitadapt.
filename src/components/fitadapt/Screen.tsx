import type { ReactNode } from "react";

export function Screen({ children }: { children: ReactNode }) {
  return <main className="fa-screen">{children}</main>;
}

export function Stat({ icon, label, value }: { icon?: ReactNode; label: string; value: ReactNode }) {
  return (
    <div className="fa-stat">
      <div className="fa-stat-label">
        {icon}
        {label}
      </div>
      <div className="fa-stat-value">{value}</div>
    </div>
  );
}

export function Loading() {
  return (
    <Screen>
      <p className="fa-eyebrow">FitAdapt</p>
      <p className="fa-sub">Loading…</p>
    </Screen>
  );
}
