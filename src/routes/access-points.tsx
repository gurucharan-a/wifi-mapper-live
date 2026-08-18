import { createFileRoute } from "@tanstack/react-router";
import { Radio } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import { AppShell } from "@/components/netdoc/AppShell";
import { Button } from "@/components/ui/button";
import { rssiCategory } from "@/lib/survey/heatmap";
import { useSurvey } from "@/lib/survey/store";

export const Route = createFileRoute("/access-points")({
  head: () => ({
    meta: [
      { title: "Access Points — NetDoc WiFi Survey" },
      { name: "description", content: "Detected access points with BSSID, channel, band, signal history, first seen and last seen timestamps." },
      { property: "og:title", content: "Access Points — NetDoc" },
      { property: "og:description", content: "Inspect each AP's signal history and project its coverage onto the heatmap." },
    ],
  }),
  component: AccessPointsPage,
});

function AccessPointsPage() {
  const { accessPoints, thresholds, focusedApBssid, setFocusedApBssid, setLayer, points } = useSurvey();

  return (
    <AppShell title="Access Points">
      {accessPoints.length === 0 ? (
        <div className="panel-surface p-10 text-center text-sm text-muted-foreground">
          No access points detected yet. Connect the local Wi-Fi agent or enter Demo Mode.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {accessPoints.map((ap) => {
            const cat = rssiCategory(ap.rssi, thresholds);
            const series = ap.history.slice(-60).map((h, i) => ({ i, rssi: h.rssi }));
            const apPoints = points.filter((p) => p.bssid === ap.bssid).length;
            const focused = focusedApBssid === ap.bssid;
            return (
              <div key={ap.bssid} className="panel-surface space-y-3 p-3">
                <div className="flex items-start gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/40 bg-primary/10 text-primary">
                    <Radio className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{ap.ssid}</div>
                    <div className="mono-num truncate text-[11px] text-muted-foreground">{ap.bssid}</div>
                  </div>
                  <div className="mono-num ml-auto text-right text-lg font-semibold" style={{ color: cat.color }}>
                    {ap.rssi}
                    <span className="ml-1 text-[10px] text-muted-foreground">dBm</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 text-xs">
                  {[
                    ["Channel", String(ap.channel || "—")],
                    ["Band", ap.band],
                    ["Freq", ap.frequency ? `${ap.frequency}` : "—"],
                    ["Points", String(apPoints)],
                  ].map(([l, v]) => (
                    <div key={l}>
                      <div className="label-caps text-[10px]">{l}</div>
                      <div className="mono-num">{v}</div>
                    </div>
                  ))}
                </div>

                <div className="h-14">
                  {series.length > 1 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={series}>
                        <YAxis domain={[-95, -25]} hide />
                        <Line type="monotone" dataKey="rssi" stroke={cat.color} strokeWidth={1.6} dot={false} isAnimationActive={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex h-full items-center text-[11px] text-muted-foreground">Collecting signal history…</div>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>First seen {new Date(ap.firstSeen).toLocaleTimeString()}</span>
                  <span>Last seen {new Date(ap.lastSeen).toLocaleTimeString()}</span>
                </div>

                <Button
                  size="sm"
                  variant={focused ? "secondary" : "outline"}
                  className="h-8 w-full text-xs"
                  onClick={() => {
                    setFocusedApBssid(focused ? null : ap.bssid);
                    setLayer("ap_coverage");
                  }}
                >
                  {focused ? "Showing on heatmap" : "Show measurements on heatmap"}
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
