import { createFileRoute } from "@tanstack/react-router";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useMemo } from "react";

import { AppShell } from "@/components/netdoc/AppShell";
import { SignalChart } from "@/components/netdoc/SignalChart";
import { Button } from "@/components/ui/button";
import { computeStats } from "@/lib/survey/analysis";
import { rssiCategory } from "@/lib/survey/heatmap";
import { useSurvey } from "@/lib/survey/store";

export const Route = createFileRoute("/analytics")({
  head: () => ({
    meta: [
      { title: "Survey Analytics — NetDoc WiFi Survey" },
      { name: "description", content: "Real-time RSSI, SNR, link rate, ping and download charts plus coverage distribution for the current survey." },
      { property: "og:title", content: "Survey Analytics — NetDoc" },
      { property: "og:description", content: "Live charts and coverage distribution from recorded Wi-Fi measurements." },
    ],
  }),
  component: AnalyticsPage,
});

function AnalyticsPage() {
  const { samples, points, thresholds, chartsPaused, setChartsPaused } = useSurvey();
  const stats = computeStats(points, thresholds);
  const chartSamples = chartsPaused ? samples.slice(0, Math.max(0, samples.length - 1)) : samples;

  const distribution = useMemo(() => {
    const buckets = [
      { key: "Excellent", min: thresholds.excellent },
      { key: "Good", min: thresholds.good },
      { key: "Fair", min: thresholds.fair },
      { key: "Weak", min: thresholds.weak },
      { key: "Dead", min: -200 },
    ];
    return buckets.map((b, i) => {
      const upper = i === 0 ? 0 : buckets[i - 1]!.min;
      const count = points.filter((p) => p.rssi != null && p.rssi >= b.min && (i === 0 || p.rssi < upper)).length;
      return { key: b.key, count, color: rssiCategory(b.min + 1, thresholds).color };
    });
  }, [points, thresholds]);

  return (
    <AppShell title="Analytics">
      <div className="space-y-3">
        <div className="panel-surface flex flex-wrap items-center gap-4 p-3">
          {[
            ["Samples", String(stats.count)],
            ["Coverage", `${stats.coveragePct}%`],
            ["Avg RSSI", stats.avgRssi != null ? `${stats.avgRssi.toFixed(1)} dBm` : "—"],
            ["Avg SNR", stats.avgSnr != null ? `${stats.avgSnr.toFixed(1)} dB` : "—"],
            ["Avg link rate", stats.avgLinkRate != null ? `${stats.avgLinkRate.toFixed(0)} Mbps` : "—"],
            ["Avg ping", stats.avgPing != null ? `${stats.avgPing.toFixed(0)} ms` : "—"],
          ].map(([l, v]) => (
            <div key={l}>
              <div className="label-caps text-[10px]">{l}</div>
              <div className="mono-num text-sm">{v}</div>
            </div>
          ))}
          <Button size="sm" variant="outline" className="ml-auto h-8 text-xs" onClick={() => setChartsPaused(!chartsPaused)}>
            {chartsPaused ? "Resume chart updates" : "Pause chart updates"}
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <SignalChart metric="rssi" samples={chartSamples} />
          <SignalChart metric="snr" samples={chartSamples} />
          <SignalChart metric="link_rate" samples={chartSamples} />
          <SignalChart metric="ping_ms" samples={chartSamples} />
          <SignalChart metric="download_mbps" samples={chartSamples} />

          <div className="panel-surface p-3">
            <div className="label-caps mb-2">Coverage distribution</div>
            <div style={{ height: 150 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={distribution} margin={{ top: 4, right: 4, bottom: 0, left: -24 }}>
                  <CartesianGrid stroke="var(--grid)" strokeDasharray="2 4" vertical={false} />
                  <XAxis dataKey="key" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={40} />
                  <Tooltip
                    cursor={{ fill: "var(--muted)", opacity: 0.25 }}
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} isAnimationActive={false}>
                    {distribution.map((d) => (
                      <Cell key={d.key} fill={d.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
