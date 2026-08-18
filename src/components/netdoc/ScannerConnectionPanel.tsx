import { Plug, PlugZap, Unplug } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusDot } from "@/components/netdoc/ConnectionStatus";
import { toWsUrl } from "@/lib/survey/agent";
import { useSurvey } from "@/lib/survey/store";

const ENDPOINTS = [
  ["GET", "/health", "Agent liveness + version"],
  ["GET", "/wifi/current", "Current association metrics"],
  ["GET", "/wifi/networks", "Last scan results"],
  ["POST", "/wifi/scan", "Trigger a fresh scan"],
  ["GET", "/wifi/interfaces", "Available WLAN interfaces"],
] as const;

export function ScannerConnectionPanel() {
  const { agentUrl, setAgentUrl, connect, disconnect, testConnection, scannerStatus, scannerMessage, mode, enterDemoMode } =
    useSurvey();

  const tone = scannerStatus === "online" ? (mode === "demo" ? "demo" : "live") : scannerStatus === "connecting" ? "connecting" : "offline";

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="panel-surface space-y-4 p-4">
        <div>
          <h2 className="text-lg font-semibold">Local Wi-Fi Agent</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            NetDoc reads real Wi-Fi metrics from a local agent running on this machine. Browsers cannot access Windows WLAN
            APIs directly, so the agent exposes REST + WebSocket endpoints on loopback.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="agent-url">Agent URL</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="agent-url"
              value={agentUrl}
              onChange={(e) => setAgentUrl(e.target.value)}
              className="h-9 min-w-[240px] flex-1 font-mono text-sm"
              spellCheck={false}
            />
            <Button className="h-9 gap-2" onClick={connect}>
              <PlugZap className="h-4 w-4" /> Connect
            </Button>
            <Button variant="outline" className="h-9 gap-2" onClick={() => void testConnection()}>
              <Plug className="h-4 w-4" /> Test Connection
            </Button>
            <Button variant="ghost" className="h-9 gap-2 text-muted-foreground" onClick={disconnect}>
              <Unplug className="h-4 w-4" /> Disconnect
            </Button>
          </div>
          <p className="mono-num text-xs text-muted-foreground">WebSocket: {toWsUrl(agentUrl)}</p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-border/70 bg-panel/60 px-3 py-2">
          <StatusDot tone={tone} />
          <span className="text-sm">{scannerMessage}</span>
          {scannerStatus !== "online" ? (
            <Button size="sm" variant="secondary" className="ml-auto h-7 text-xs" onClick={enterDemoMode}>
              Enter Demo Mode
            </Button>
          ) : null}
        </div>

        <div className="rounded-md border border-border/70 bg-panel/40 p-3">
          <div className="label-caps mb-2">Expected agent contract</div>
          <div className="space-y-1.5">
            {ENDPOINTS.map(([m, p, d]) => (
              <div key={p} className="flex items-center gap-2 text-xs">
                <span className="mono-num w-12 rounded bg-muted px-1.5 py-0.5 text-center text-[10px] text-foreground">{m}</span>
                <span className="mono-num text-foreground">{p}</span>
                <span className="ml-auto text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel-surface p-4">
        <div className="label-caps mb-2">WebSocket message schema</div>
        <pre className="mono-num overflow-x-auto rounded-md border border-border/70 bg-[oklch(0.15_0.014_250)] p-3 text-[11px] leading-relaxed text-muted-foreground">
{`{
  "type": "wifi_measurement",
  "timestamp": "2026-01-01T10:00:00Z",
  "ssid": "NetDoc-Corp",
  "bssid": "A4:2B:B0:11:20:01",
  "rssi": -52,
  "snr": 31,
  "channel": 36,
  "frequency": 5180,
  "band": "5 GHz",
  "link_rate": 866,
  "tx_rate": 866,
  "rx_rate": 866
}`}
        </pre>
        <p className="mt-3 text-xs text-muted-foreground">
          Unknown or missing fields are accepted and rendered as “—”. Messages with <code className="mono-num">type</code> set to{" "}
          <code className="mono-num">wifi_networks</code> update the Networks table.
        </p>
      </div>
    </div>
  );
}
