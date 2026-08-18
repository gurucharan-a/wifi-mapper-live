import { Footprints, Pause, Play, Square, Trash2, Upload } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { computeStats } from "@/lib/survey/analysis";
import { useSurvey } from "@/lib/survey/store";

function fmtDuration(ms: number) {
  const total = Math.floor(ms / 1000);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/70 bg-panel/50 px-2.5 py-2">
      <div className="label-caps text-[10px]">{label}</div>
      <div className="mono-num text-sm text-foreground">{value}</div>
    </div>
  );
}

export function SurveyControls() {
  const {
    surveyState,
    startSurvey,
    pauseSurvey,
    stopSurvey,
    clearMeasurements,
    points,
    elapsedMs,
    thresholds,
    mode,
    demoWalking,
    toggleDemoWalk,
    setFloorPlanImage,
    position,
  } = useSurvey();

  const fileRef = useRef<HTMLInputElement | null>(null);
  const stats = computeStats(points, thresholds);

  const onFile = (file: File | undefined) => {
    if (!file) return;
    if (file.type === "application/pdf") {
      toast.error("PDF floor plans must be exported to PNG/JPG first");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setFloorPlanImage(file.name, String(reader.result));
    reader.readAsDataURL(file);
  };

  return (
    <div className="panel-surface space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        {surveyState !== "running" ? (
          <Button onClick={startSurvey} className="h-9 gap-2 font-semibold tracking-wide">
            <Play className="h-4 w-4" />
            {surveyState === "paused" ? "RESUME SURVEY" : "START SURVEY"}
          </Button>
        ) : (
          <Button onClick={pauseSurvey} variant="secondary" className="h-9 gap-2 font-semibold tracking-wide">
            <Pause className="h-4 w-4" />
            PAUSE SURVEY
          </Button>
        )}
        <Button onClick={stopSurvey} variant="outline" className="h-9 gap-2" disabled={surveyState === "stopped"}>
          <Square className="h-4 w-4" />
          Stop
        </Button>
        <Button onClick={clearMeasurements} variant="ghost" className="h-9 gap-2 text-muted-foreground">
          <Trash2 className="h-4 w-4" />
          Clear
        </Button>
        <Button variant="outline" className="h-9 gap-2" onClick={() => fileRef.current?.click()}>
          <Upload className="h-4 w-4" />
          Floor plan
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,application/pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0])}
        />
        <Button
          variant={demoWalking ? "secondary" : "outline"}
          className="h-9 gap-2"
          onClick={toggleDemoWalk}
          title="Simulate a technician walking the floor"
        >
          <Footprints className="h-4 w-4" />
          {demoWalking ? "Stop Demo Walk" : "Start Demo Walk"}
        </Button>
      </div>

      {surveyState === "running" && !position ? (
        <p className="rounded-md border border-[var(--signal-fair)]/40 bg-[var(--signal-fair)]/10 px-2.5 py-1.5 text-xs text-[var(--signal-fair)]">
          Set your position on the floor plan to start recording points.
        </p>
      ) : null}
      {mode === "idle" ? (
        <p className="rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
          Scanner Offline — connect the local Wi-Fi agent or enter Demo Mode to record measurements.
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
        <Stat label="Measurements" value={String(stats.count)} />
        <Stat label="Duration" value={fmtDuration(elapsedMs)} />
        <Stat label="Area covered" value={`${stats.coveragePct}%`} />
        <Stat label="Average RSSI" value={stats.avgRssi != null ? `${stats.avgRssi.toFixed(0)} dBm` : "—"} />
        <Stat label="Weakest RSSI" value={stats.minRssi != null ? `${stats.minRssi} dBm` : "—"} />
        <Stat label="Best RSSI" value={stats.maxRssi != null ? `${stats.maxRssi} dBm` : "—"} />
      </div>
    </div>
  );
}
