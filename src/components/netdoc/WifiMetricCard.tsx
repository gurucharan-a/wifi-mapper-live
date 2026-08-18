import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface WifiMetricCardProps {
  label: string;
  value: number | string | null | undefined;
  unit?: string;
  hint?: string;
  icon?: ReactNode;
  tone?: "default" | "excellent" | "good" | "fair" | "weak" | "dead";
  simulated?: boolean;
  digits?: number;
}

const toneRing: Record<NonNullable<WifiMetricCardProps["tone"]>, string> = {
  default: "border-border",
  excellent: "border-[var(--signal-excellent)]/45",
  good: "border-[var(--signal-good)]/45",
  fair: "border-[var(--signal-fair)]/45",
  weak: "border-[var(--signal-weak)]/50",
  dead: "border-[var(--signal-dead)]/55",
};

const toneText: Record<NonNullable<WifiMetricCardProps["tone"]>, string> = {
  default: "text-foreground",
  excellent: "text-[var(--signal-excellent)]",
  good: "text-[var(--signal-good)]",
  fair: "text-[var(--signal-fair)]",
  weak: "text-[var(--signal-weak)]",
  dead: "text-[var(--signal-dead)]",
};

export function WifiMetricCard({
  label,
  value,
  unit,
  hint,
  icon,
  tone = "default",
  simulated,
  digits = 0,
}: WifiMetricCardProps) {
  const hasValue = value !== null && value !== undefined && value !== "";
  const display =
    typeof value === "number" ? (Number.isInteger(value) ? value : value.toFixed(digits)) : value;

  return (
    <div className={cn("panel-surface relative overflow-hidden p-3", toneRing[tone])}>
      <div className="flex items-center justify-between gap-2">
        <span className="label-caps">{label}</span>
        {icon ? <span className="text-muted-foreground">{icon}</span> : null}
      </div>
      <div className="mt-1.5 flex items-baseline gap-1">
        <span className={cn("mono-num text-2xl font-semibold", hasValue ? toneText[tone] : "text-muted-foreground/50")}>
          {hasValue ? display : "—"}
        </span>
        {hasValue && unit ? <span className="mono-num text-xs text-muted-foreground">{unit}</span> : null}
      </div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
        {simulated && hasValue ? (
          <span className="rounded-sm bg-[var(--demo)]/15 px-1 py-px font-semibold tracking-wide text-[var(--demo)] uppercase">
            sim
          </span>
        ) : null}
        <span className="truncate">{hint ?? (hasValue ? "" : "Waiting for Wi-Fi scanner…")}</span>
      </div>
    </div>
  );
}
