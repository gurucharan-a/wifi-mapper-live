import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { FolderOpen, PlayCircle, Radar, SignalHigh, Sparkles } from "lucide-react";

import { StatusDot } from "@/components/netdoc/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { useSurvey } from "@/lib/survey/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NetDoc WiFi Survey — Live Coverage Mapping" },
      {
        name: "description",
        content:
          "Turn real Wi-Fi measurements into a live coverage map. Walk a floor plan, record RSSI and SNR from a local agent, and generate heatmaps and reports.",
      },
      { property: "og:title", content: "NetDoc WiFi Survey — Live Coverage Mapping" },
      {
        property: "og:description",
        content: "Professional Wi-Fi site surveying: live RSSI/SNR capture, interpolated heatmaps, dead-zone troubleshooting and exportable reports.",
      },
    ],
  }),
  component: Landing,
});

function StatusLine({ label, value, tone }: { label: string; value: string; tone: "live" | "demo" | "offline" }) {
  return (
    <div className="flex items-center gap-2.5 rounded-md border border-border/70 bg-panel/50 px-3 py-2">
      <StatusDot tone={tone} />
      <span className="label-caps text-[10px]">{label}</span>
      <span className="mono-num ml-auto text-xs text-foreground">{value}</span>
    </div>
  );
}

function Landing() {
  const navigate = useNavigate();
  const { scannerStatus, mode, current, position, positionSource, enterDemoMode, newProject } = useSurvey();

  return (
    <div className="relative flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center gap-2 px-6 py-5">
        <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
          <SignalHigh className="h-4 w-4" />
        </span>
        <span className="font-display text-sm font-semibold tracking-tight">NetDoc WiFi Survey</span>
        <span className="mono-num ml-auto text-[11px] text-muted-foreground">local agent · 127.0.0.1:8765</span>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-6 py-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-panel/60 px-3 py-1 text-[11px] tracking-wide text-muted-foreground uppercase">
            <Radar className="h-3.5 w-3.5 text-primary" /> Wi-Fi site survey platform
          </span>
          <h1 className="mt-5 text-4xl leading-[1.05] font-semibold sm:text-5xl">
            NetDoc <span className="text-primary">WiFi Survey</span>
          </h1>
          <p className="mt-4 max-w-xl text-base text-muted-foreground">
            Turn real Wi-Fi measurements into a live coverage map. Upload a floor plan, calibrate it, walk the site, and watch
            an interpolated RSSI heatmap build in real time from your local Wi-Fi agent.
          </p>

          <div className="mt-7 flex flex-wrap gap-2.5">
            <Button
              className="h-11 gap-2 px-5 font-semibold tracking-wide"
              onClick={() => {
                newProject("New Survey");
                void navigate({ to: "/survey" });
              }}
            >
              <PlayCircle className="h-4.5 w-4.5" /> START NEW SURVEY
            </Button>
            <Button variant="outline" className="h-11 gap-2 px-5" onClick={() => void navigate({ to: "/projects" })}>
              <FolderOpen className="h-4.5 w-4.5" /> OPEN PROJECT
            </Button>
            <Button
              variant="secondary"
              className="h-11 gap-2 px-5"
              onClick={() => {
                enterDemoMode();
                void navigate({ to: "/survey" });
              }}
            >
              <Sparkles className="h-4.5 w-4.5" /> TRY DEMO MODE
            </Button>
          </div>

          <p className="mt-5 max-w-xl text-xs text-muted-foreground">
            Browsers cannot read Windows WLAN RSSI/BSSID data directly. NetDoc reads real measurements from a local FastAPI
            agent over REST and WebSocket — nothing is fabricated in live hardware mode.
          </p>
        </div>

        <div className="panel-surface space-y-2 p-4">
          <div className="label-caps mb-1">System status</div>
          <StatusLine
            label="Scanner"
            value={scannerStatus === "online" ? (mode === "demo" ? "Demo scanner" : "Online") : "Offline"}
            tone={scannerStatus === "online" ? (mode === "demo" ? "demo" : "live") : "offline"}
          />
          <StatusLine label="Network" value={current?.ssid ?? "Not connected"} tone={current?.ssid ? "live" : "offline"} />
          <StatusLine
            label="Position"
            value={position ? (positionSource === "manual" ? "Floor Plan Manual" : positionSource === "agent" ? "Local Agent" : "Demo Walk") : "Not available"}
            tone={position ? "live" : "offline"}
          />
          <Button variant="ghost" className="mt-2 h-9 w-full text-xs" onClick={() => void navigate({ to: "/scanner" })}>
            Configure local agent →
          </Button>
        </div>
      </main>

      <footer className="mx-auto w-full max-w-6xl px-6 py-6 text-[11px] text-muted-foreground">
        Live hardware mode shows only measured values. Demo mode is always labelled “DEMO MODE — SIMULATED DATA”.
      </footer>
    </div>
  );
}
