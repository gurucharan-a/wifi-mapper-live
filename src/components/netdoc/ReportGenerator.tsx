import { FileDown, FileJson, Image as ImageIcon, Printer } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { FloorPlanViewer } from "@/components/netdoc/FloorPlanViewer";
import { SignalChart } from "@/components/netdoc/SignalChart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { analyze, computeStats } from "@/lib/survey/analysis";
import { exportCanvasPng, exportCsv, exportJson } from "@/lib/survey/export";
import { useSurvey } from "@/lib/survey/store";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border/50 py-1.5 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="mono-num text-sm text-foreground">{value}</span>
    </div>
  );
}

export function ReportGenerator() {
  const { projectName, setProjectName, points, thresholds, accessPoints, targetSsid, samples, snapshot, mode } = useSurvey();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stats = computeStats(points, thresholds);
  const findings = analyze(points, thresholds);
  const channels = [...new Set(points.map((p) => p.channel).filter((c): c is number => c != null))];

  return (
    <div className="space-y-4">
      <div className="panel-surface flex flex-wrap items-center gap-2 p-3">
        <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-9 max-w-xs" placeholder="Project name" />
        <div className="ml-auto flex flex-wrap gap-2">
          <Button variant="outline" className="h-9 gap-2" onClick={() => exportCsv(snapshot())}>
            <FileDown className="h-4 w-4" /> Export CSV
          </Button>
          <Button variant="outline" className="h-9 gap-2" onClick={() => exportJson(snapshot(), { stats, findings })}>
            <FileJson className="h-4 w-4" /> Export JSON
          </Button>
          <Button
            variant="outline"
            className="h-9 gap-2"
            onClick={() => {
              if (!canvasRef.current) return toast.error("Heatmap not ready");
              exportCanvasPng(canvasRef.current, projectName);
            }}
          >
            <ImageIcon className="h-4 w-4" /> Export PNG
          </Button>
          <Button className="h-9 gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Print Report
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-4">
          <FloorPlanViewer className="min-h-[420px]" canvasRef={canvasRef} />
          <div className="grid gap-3 md:grid-cols-2">
            <SignalChart metric="rssi" samples={samples} height={130} />
            <SignalChart metric="snr" samples={samples} height={130} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="panel-surface p-4">
            <h3 className="text-base font-semibold">{projectName}</h3>
            <p className="text-xs text-muted-foreground">
              {new Date().toLocaleString()} · {mode === "demo" ? "DEMO MODE — SIMULATED DATA" : mode === "live" ? "Live hardware data" : "No data source"}
            </p>
            <div className="mt-3">
              <Row label="Selected SSID" value={targetSsid ?? "—"} />
              <Row label="Access points" value={String(accessPoints.length)} />
              <Row label="Measurements" value={String(stats.count)} />
              <Row label="Coverage" value={`${stats.coveragePct} %`} />
              <Row label="Average RSSI" value={stats.avgRssi != null ? `${stats.avgRssi.toFixed(1)} dBm` : "—"} />
              <Row label="Minimum RSSI" value={stats.minRssi != null ? `${stats.minRssi} dBm` : "—"} />
              <Row label="Maximum RSSI" value={stats.maxRssi != null ? `${stats.maxRssi} dBm` : "—"} />
              <Row label="Average SNR" value={stats.avgSnr != null ? `${stats.avgSnr.toFixed(1)} dB` : "—"} />
              <Row label="Dead-zone samples" value={String(stats.deadZones)} />
              <Row label="Channels observed" value={channels.length ? channels.join(", ") : "—"} />
            </div>
          </div>

          <div className="panel-surface p-4">
            <div className="label-caps mb-2">Findings</div>
            {findings.length === 0 ? (
              <p className="text-xs text-muted-foreground">No issues detected.</p>
            ) : (
              <ul className="space-y-1.5">
                {findings.map((f) => (
                  <li key={f.id} className="flex items-start gap-2 text-xs">
                    <span
                      className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                      style={{
                        background:
                          f.severity === "critical" ? "var(--signal-dead)" : f.severity === "warning" ? "var(--signal-fair)" : "var(--primary)",
                      }}
                    />
                    <span className="text-foreground">{f.title}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
