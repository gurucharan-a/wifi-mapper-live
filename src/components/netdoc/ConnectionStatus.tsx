import { Activity, Radio, Wifi, WifiOff } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSurvey } from "@/lib/survey/store";

export function StatusDot({ tone }: { tone: "live" | "demo" | "offline" | "connecting" }) {
  const color =
    tone === "live"
      ? "bg-[var(--live)]"
      : tone === "demo"
        ? "bg-[var(--demo)]"
        : tone === "connecting"
          ? "bg-primary"
          : "bg-[var(--offline)]";
  return (
    <span className="relative flex h-2 w-2">
      {tone !== "offline" && (
        <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-70 position-pulse", color)} />
      )}
      <span className={cn("relative inline-flex h-2 w-2 rounded-full", color)} />
    </span>
  );
}

function Item({
  label,
  value,
  tone,
  icon,
}: {
  label: string;
  value: string;
  tone?: "live" | "demo" | "offline" | "connecting";
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-md border border-border/70 bg-panel/60 px-2.5 py-1.5">
      {tone ? <StatusDot tone={tone} /> : icon}
      <div className="min-w-0 leading-tight">
        <div className="label-caps text-[10px]">{label}</div>
        <div className="mono-num truncate text-xs text-foreground">{value}</div>
      </div>
    </div>
  );
}

export function ConnectionStatus({ compact = false }: { compact?: boolean }) {
  const { mode, scannerStatus, current, targetSsid, positionSource, position } = useSurvey();

  const scannerTone =
    scannerStatus === "online" ? (mode === "demo" ? "demo" : "live") : scannerStatus === "connecting" ? "connecting" : "offline";
  const scannerLabel =
    scannerStatus === "online"
      ? mode === "demo"
        ? "Demo scanner"
        : "Connected"
      : scannerStatus === "connecting"
        ? "Connecting…"
        : "Scanner Offline";

  const ssid = current?.ssid ?? targetSsid ?? "Not connected";
  const posLabel =
    position == null
      ? "Not available"
      : positionSource === "manual"
        ? "Floor Plan Manual"
        : positionSource === "agent"
          ? "Local Agent"
          : "Demo Walk";

  return (
    <div className={cn("flex flex-wrap items-center gap-2", compact && "gap-1.5")}>
      <Item label="Scanner" value={scannerLabel} tone={scannerTone} />
      <Item
        label="Network"
        value={ssid}
        icon={current?.ssid ? <Wifi className="h-3.5 w-3.5 text-primary" /> : <WifiOff className="h-3.5 w-3.5 text-muted-foreground" />}
      />
      <Item label="Position" value={posLabel} icon={<Radio className="h-3.5 w-3.5 text-muted-foreground" />} />
      <div
        className={cn(
          "flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-[11px] font-semibold tracking-wide uppercase",
          mode === "live"
            ? "border-[var(--live)]/40 bg-[var(--live)]/10 text-[var(--live)]"
            : mode === "demo"
              ? "border-[var(--demo)]/40 bg-[var(--demo)]/10 text-[var(--demo)]"
              : "border-border bg-muted/40 text-muted-foreground",
        )}
      >
        <Activity className="h-3.5 w-3.5" />
        {mode === "live" ? "Live Hardware" : mode === "demo" ? "Demo Mode" : "No Source"}
      </div>
    </div>
  );
}
