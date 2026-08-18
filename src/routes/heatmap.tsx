import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/netdoc/AppShell";
import { FloorPlanViewer } from "@/components/netdoc/FloorPlanViewer";
import { HeatmapLegend } from "@/components/netdoc/HeatmapLegend";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LAYERS } from "@/lib/survey/heatmap";
import { useSurvey } from "@/lib/survey/store";
import type { HeatmapLayer } from "@/lib/survey/types";

export const Route = createFileRoute("/heatmap")({
  head: () => ({
    meta: [
      { title: "Coverage Heatmap — NetDoc WiFi Survey" },
      { name: "description", content: "Interpolated Wi-Fi coverage heatmaps for RSSI, SNR, noise, link rate, throughput, latency and packet loss." },
      { property: "og:title", content: "Coverage Heatmap — NetDoc" },
      { property: "og:description", content: "Switch between RSSI, SNR, noise and throughput heatmap layers over your floor plan." },
    ],
  }),
  component: HeatmapPage,
});

function HeatmapPage() {
  const {
    layer,
    setLayer,
    thresholds,
    setThresholds,
    heatmapOpacity,
    setHeatmapOpacity,
    accessPoints,
    focusedApBssid,
    setFocusedApBssid,
    points,
  } = useSurvey();

  return (
    <AppShell title="Heatmap">
      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_330px]">
        <FloorPlanViewer className="min-h-[620px]" />
        <div className="space-y-3">
          <div className="panel-surface space-y-3 p-3">
            <div>
              <Label className="label-caps">Layer</Label>
              <Select value={layer} onValueChange={(v) => setLayer(v as HeatmapLayer)}>
                <SelectTrigger className="mt-1 h-9 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LAYERS.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {layer === "ap_coverage" ? (
              <div>
                <Label className="label-caps">Access point</Label>
                <Select value={focusedApBssid ?? "all"} onValueChange={(v) => setFocusedApBssid(v === "all" ? null : v)}>
                  <SelectTrigger className="mt-1 h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All access points</SelectItem>
                    {accessPoints.map((a) => (
                      <SelectItem key={a.bssid} value={a.bssid}>
                        {a.ssid} · {a.bssid.slice(-8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div>
              <Label className="label-caps">Overlay opacity — {Math.round(heatmapOpacity * 100)}%</Label>
              <Slider className="mt-2" min={10} max={100} step={5} value={[heatmapOpacity * 100]} onValueChange={([v]) => setHeatmapOpacity((v ?? 70) / 100)} />
            </div>
          </div>

          <div className="panel-surface space-y-3 p-3">
            <div className="label-caps">RSSI thresholds (dBm)</div>
            {(["excellent", "good", "fair", "weak"] as const).map((k) => (
              <div key={k}>
                <div className="flex justify-between text-xs">
                  <span className="capitalize text-muted-foreground">{k}</span>
                  <span className="mono-num">{thresholds[k]}</span>
                </div>
                <Slider
                  className="mt-1.5"
                  min={-90}
                  max={-30}
                  step={1}
                  value={[thresholds[k]]}
                  onValueChange={([v]) => setThresholds({ ...thresholds, [k]: v ?? thresholds[k] })}
                />
              </div>
            ))}
          </div>

          <HeatmapLegend layer={layer} thresholds={thresholds} />

          <div className="panel-surface p-3 text-xs text-muted-foreground">
            Heatmap is interpolated from {points.length} recorded measurement point(s). Areas without nearby samples stay
            uncoloured — no coverage is invented.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
