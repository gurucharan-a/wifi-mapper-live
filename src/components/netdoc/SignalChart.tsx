import { useMemo } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import type { WifiSample } from "@/lib/survey/types";

export type SignalMetric = "rssi" | "snr" | "link_rate" | "ping_ms" | "download_mbps";

const META: Record<SignalMetric, { label: string; unit: string; color: string; domain?: [number, number] }> = {
  rssi: { label: "RSSI", unit: "dBm", color: "var(--chart-1)", domain: [-95, -25] },
  snr: { label: "SNR", unit: "dB", color: "var(--chart-2)", domain: [0, 50] },
  link_rate: { label: "Link Rate", unit: "Mbps", color: "var(--chart-3)" },
  ping_ms: { label: "Ping", unit: "ms", color: "var(--chart-5)" },
  download_mbps: { label: "Download", unit: "Mbps", color: "var(--chart-4)" },
};

export function SignalChart({
  metric,
  samples,
  height = 150,
}: {
  metric: SignalMetric;
  samples: WifiSample[];
  height?: number;
}) {
  const meta = META[metric];
  const data = useMemo(
    () =>
      samples.slice(-90).map((s, i) => ({
        i,
        t: new Date(s.timestamp).toLocaleTimeString([], { minute: "2-digit", second: "2-digit" }),
        v: (s[metric] as number | null | undefined) ?? null,
      })),
    [samples, metric],
  );

  const hasData = data.some((d) => d.v != null);

  return (
    <div className="panel-surface p-3">
      <div className="mb-1 flex items-center justify-between">
        <span className="label-caps">
          {meta.label} <span className="text-muted-foreground/60">({meta.unit})</span>
        </span>
        <span className="mono-num text-xs text-foreground">
          {hasData ? `${data.filter((d) => d.v != null).slice(-1)[0]?.v ?? "—"} ${meta.unit}` : "—"}
        </span>
      </div>
      <div style={{ height }}>
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: -22 }}>
              <defs>
                <linearGradient id={`grad-${metric}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={meta.color} stopOpacity={0.45} />
                  <stop offset="100%" stopColor={meta.color} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} minTickGap={40} axisLine={false} tickLine={false} />
              <YAxis
                {...(meta.domain ? { domain: meta.domain } : {})}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={46}
              />
              <Tooltip
                contentStyle={{
                  background: "var(--popover)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  fontSize: 12,
                }}
                labelStyle={{ color: "var(--muted-foreground)" }}
                formatter={(v: number | string) => [`${v} ${meta.unit}`, meta.label]}
              />
              <Area type="monotone" dataKey="v" stroke={meta.color} strokeWidth={1.8} fill={`url(#grad-${metric})`} isAnimationActive={false} connectNulls />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
            Waiting for Wi-Fi scanner…
          </div>
        )}
      </div>
    </div>
  );
}
