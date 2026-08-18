import { AlertTriangle, Info, ShieldAlert, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { analyze, buildAiTroubleshootPayload } from "@/lib/survey/analysis";
import { useSurvey } from "@/lib/survey/store";
import type { Finding } from "@/lib/survey/types";

/**
 * Endpoint that a server-side AI troubleshooting handler is expected to expose.
 * The key for the provider (e.g. OpenRouter) stays server-side — never in the browser.
 */
const AI_ENDPOINT = "/api/ai/troubleshoot";

const SEVERITY = {
  critical: { label: "CRITICAL", icon: ShieldAlert, color: "var(--signal-dead)" },
  warning: { label: "WARNING", icon: AlertTriangle, color: "var(--signal-fair)" },
  info: { label: "INFO", icon: Info, color: "var(--primary)" },
} as const;

function FindingCard({ f }: { f: Finding }) {
  const s = SEVERITY[f.severity];
  return (
    <div className="panel-surface overflow-hidden" style={{ borderColor: `color-mix(in oklch, ${s.color} 45%, transparent)` }}>
      <div className="flex items-center gap-2 border-b border-border/60 px-3 py-2" style={{ background: `color-mix(in oklch, ${s.color} 10%, transparent)` }}>
        <s.icon className="h-4 w-4" style={{ color: s.color }} />
        <span className="text-[11px] font-bold tracking-widest" style={{ color: s.color }}>
          {s.label}
        </span>
        <span className="ml-2 text-sm font-medium text-foreground">{f.title}</span>
      </div>
      <div className="space-y-3 p-3">
        <div className="flex flex-wrap gap-4">
          {f.metrics.map((m) => (
            <div key={m.label}>
              <div className="label-caps text-[10px]">{m.label}</div>
              <div className="mono-num text-sm">{m.value}</div>
            </div>
          ))}
        </div>
        <div>
          <div className="label-caps mb-1 text-[10px]">Possible causes</div>
          <ul className="list-inside list-disc space-y-0.5 text-xs text-muted-foreground">
            {f.causes.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-md border border-border/70 bg-panel/50 px-2.5 py-2">
          <div className="label-caps text-[10px]">Recommended action</div>
          <p className="text-xs text-foreground">{f.action}</p>
        </div>
      </div>
    </div>
  );
}

export function TroubleshootingPanel() {
  const { points, thresholds, targetSsid, mode } = useSurvey();
  const findings = analyze(points, thresholds);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const runAi = async () => {
    setBusy(true);
    setAiAnswer(null);
    const payload = buildAiTroubleshootPayload(points, thresholds, { ssid: targetSsid, mode });
    try {
      const res = await fetch(AI_ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(`Endpoint responded ${res.status}`);
      const data = (await res.json()) as { analysis?: string; message?: string };
      setAiAnswer(data.analysis ?? data.message ?? "No analysis returned.");
    } catch (e) {
      toast.error("AI troubleshooting endpoint not connected", {
        description: `Expected POST ${AI_ENDPOINT} — ${e instanceof Error ? e.message : "unavailable"}`,
      });
      setAiAnswer(
        `AI endpoint not connected yet. The survey payload below is ready to POST to ${AI_ENDPOINT}:\n\n` +
          JSON.stringify({ ...payload, sample: `${payload.sample.length} recent points` }, null, 2),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="panel-surface flex flex-wrap items-center gap-3 p-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">Rule-based analysis of {points.length} measurement points</div>
          <div className="text-xs text-muted-foreground">
            {findings.length ? `${findings.length} issue(s) detected` : "No issues detected yet — collect more samples."}
          </div>
        </div>
        <Button className="ml-auto h-9 gap-2" onClick={() => void runAi()} disabled={busy || points.length === 0}>
          <Sparkles className="h-4 w-4" />
          {busy ? "Analyzing…" : "Troubleshoot with AI"}
        </Button>
      </div>

      {aiAnswer ? (
        <div className="panel-surface p-3">
          <div className="label-caps mb-1.5">AI analysis</div>
          <pre className="mono-num max-h-72 overflow-auto text-[11px] leading-relaxed whitespace-pre-wrap text-muted-foreground">{aiAnswer}</pre>
        </div>
      ) : null}

      {points.length === 0 ? (
        <div className="panel-surface p-10 text-center text-sm text-muted-foreground">
          No measurements collected. Run a survey to enable troubleshooting.
        </div>
      ) : (
        <div className="grid gap-3 xl:grid-cols-2">
          {findings.map((f) => (
            <FindingCard key={f.id} f={f} />
          ))}
          {findings.length === 0 ? (
            <div className="panel-surface p-6 text-sm text-[var(--signal-excellent)]">
              All measured metrics are within healthy thresholds.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
