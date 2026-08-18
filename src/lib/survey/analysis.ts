import type { Finding, MeasurementPoint, RssiThresholds } from "./types";

export interface SurveyStats {
  count: number;
  avgRssi: number | null;
  minRssi: number | null;
  maxRssi: number | null;
  avgSnr: number | null;
  avgPing: number | null;
  avgLinkRate: number | null;
  avgLoss: number | null;
  coveragePct: number;
  deadZones: number;
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function computeStats(points: MeasurementPoint[], th: RssiThresholds): SurveyStats {
  const rssi = points.map((p) => p.rssi).filter((v): v is number => v != null);
  const snr = points.map((p) => p.snr).filter((v): v is number => v != null);
  const ping = points.map((p) => p.ping_ms).filter((v): v is number => v != null);
  const rate = points.map((p) => p.link_rate).filter((v): v is number => v != null);
  const loss = points.map((p) => p.packet_loss).filter((v): v is number => v != null);

  // coverage = fraction of an 8x8 grid that contains at least one measurement
  const cells = new Set<string>();
  for (const p of points) {
    cells.add(`${Math.min(7, Math.floor(p.x * 8))}:${Math.min(7, Math.floor(p.y * 8))}`);
  }

  return {
    count: points.length,
    avgRssi: avg(rssi),
    minRssi: rssi.length ? Math.min(...rssi) : null,
    maxRssi: rssi.length ? Math.max(...rssi) : null,
    avgSnr: avg(snr),
    avgPing: avg(ping),
    avgLinkRate: avg(rate),
    avgLoss: avg(loss),
    coveragePct: Math.round((cells.size / 64) * 100),
    deadZones: rssi.filter((v) => v < th.weak).length,
  };
}

const fmt = (v: number | null, unit: string, digits = 0) =>
  v == null ? "—" : `${v.toFixed(digits)} ${unit}`;

export function analyze(points: MeasurementPoint[], th: RssiThresholds): Finding[] {
  const findings: Finding[] = [];
  if (points.length < 3) return findings;
  const stats = computeStats(points, th);

  const dead = points.filter((p) => p.rssi != null && p.rssi < th.weak);
  if (dead.length) {
    const worst = dead.reduce((a, b) => ((a.rssi ?? 0) < (b.rssi ?? 0) ? a : b));
    findings.push({
      id: "dead-zone",
      severity: "critical",
      title: `Dead Zone Detected (${dead.length} sample${dead.length > 1 ? "s" : ""})`,
      metrics: [
        { label: "RSSI", value: fmt(worst.rssi, "dBm") },
        { label: "SNR", value: fmt(worst.snr, "dB") },
        { label: "Location", value: `x ${worst.x.toFixed(2)} / y ${worst.y.toFixed(2)}` },
      ],
      causes: [
        "Excessive distance from the serving access point",
        "Physical obstruction (concrete core, metal, elevator shaft)",
        "Interference from a co-channel neighbour",
        "Poor AP placement or insufficient AP density",
      ],
      action: "Investigate AP placement and channel conditions; consider adding an AP covering this area.",
    });
  }

  const weak = points.filter((p) => p.rssi != null && p.rssi < th.fair && p.rssi >= th.weak);
  if (weak.length > points.length * 0.15) {
    findings.push({
      id: "weak-signal",
      severity: "warning",
      title: "Widespread Weak Signal",
      metrics: [
        { label: "Weak samples", value: `${weak.length} / ${points.length}` },
        { label: "Average RSSI", value: fmt(stats.avgRssi, "dBm") },
      ],
      causes: ["AP transmit power set too low", "Coverage cell too large", "Attenuating building materials"],
      action: "Raise AP TX power or add coverage; re-survey after adjustment.",
    });
  }

  const lowSnr = points.filter((p) => p.snr != null && p.snr < 20);
  if (lowSnr.length) {
    findings.push({
      id: "low-snr",
      severity: lowSnr.length > points.length * 0.25 ? "critical" : "warning",
      title: "Low Signal-to-Noise Ratio",
      metrics: [
        { label: "Samples below 20 dB", value: String(lowSnr.length) },
        { label: "Average SNR", value: fmt(stats.avgSnr, "dB") },
      ],
      causes: ["Elevated noise floor", "Non-Wi-Fi interference (microwave, DECT, video bridges)", "Overlapping co-channel BSS"],
      action: "Perform a spectrum check and move the affected radio to a cleaner channel.",
    });
  }

  const noisy = points
    .map((p) => p.noise ?? (p.rssi != null && p.snr != null ? p.rssi - p.snr : null))
    .filter((v): v is number => v != null);
  const avgNoise = noisy.length ? noisy.reduce((a, b) => a + b, 0) / noisy.length : null;
  if (avgNoise != null && avgNoise > -88) {
    findings.push({
      id: "high-noise",
      severity: "warning",
      title: "High Noise Floor",
      metrics: [{ label: "Average noise", value: fmt(avgNoise, "dBm") }],
      causes: ["Dense 2.4 GHz environment", "Industrial or RF-emitting equipment nearby"],
      action: "Prefer 5/6 GHz for clients and disable unnecessary 2.4 GHz radios.",
    });
  }

  const chanCount = new Map<number, number>();
  for (const p of points) if (p.channel != null) chanCount.set(p.channel, (chanCount.get(p.channel) ?? 0) + 1);
  const congested = [...chanCount.entries()].filter(([c]) => c <= 14 && ![1, 6, 11].includes(c));
  if (congested.length) {
    findings.push({
      id: "channel-congestion",
      severity: "info",
      title: "Non-Standard 2.4 GHz Channel In Use",
      metrics: [{ label: "Channels", value: congested.map(([c]) => c).join(", ") }],
      causes: ["Auto-channel selected an overlapping channel"],
      action: "Pin 2.4 GHz radios to channels 1, 6 or 11 to avoid partial overlap.",
    });
  }

  const rssiSeries = points.map((p) => p.rssi).filter((v): v is number => v != null);
  if (rssiSeries.length > 8) {
    const mean = rssiSeries.reduce((a, b) => a + b, 0) / rssiSeries.length;
    const sd = Math.sqrt(rssiSeries.reduce((a, b) => a + (b - mean) ** 2, 0) / rssiSeries.length);
    if (sd > 12) {
      findings.push({
        id: "unstable",
        severity: "warning",
        title: "Unstable Signal",
        metrics: [{ label: "RSSI std. deviation", value: `${sd.toFixed(1)} dB` }],
        causes: ["Frequent roaming between APs", "Multipath / reflective environment", "Intermittent interference"],
        action: "Review roaming thresholds and AP overlap (target -67 dBm cell edge).",
      });
    }
  }

  if (stats.avgLinkRate != null && stats.avgLinkRate < 150) {
    findings.push({
      id: "poor-link-rate",
      severity: "warning",
      title: "Poor Link Rate",
      metrics: [{ label: "Average link rate", value: fmt(stats.avgLinkRate, "Mbps") }],
      causes: ["Low MCS due to weak signal", "Narrow channel width", "Legacy client capabilities"],
      action: "Increase channel width where the spectrum allows and improve signal level.",
    });
  }

  if (stats.avgPing != null && stats.avgPing > 60) {
    findings.push({
      id: "latency",
      severity: "warning",
      title: "High Latency",
      metrics: [{ label: "Average ping", value: fmt(stats.avgPing, "ms") }],
      causes: ["Airtime contention", "Retransmissions from weak signal", "Upstream WAN congestion"],
      action: "Reduce client density per radio and verify the upstream path.",
    });
  }

  if (stats.avgLoss != null && stats.avgLoss > 1) {
    findings.push({
      id: "packet-loss",
      severity: stats.avgLoss > 4 ? "critical" : "warning",
      title: "Packet Loss Detected",
      metrics: [{ label: "Average loss", value: `${stats.avgLoss.toFixed(1)} %` }],
      causes: ["Excessive retries at the cell edge", "Hidden-node collisions", "Interference bursts"],
      action: "Improve cell-edge coverage and check for hidden nodes / rogue transmitters.",
    });
  }

  return findings;
}

/**
 * Payload for a future server-side AI troubleshooting endpoint
 * (e.g. a server function that calls OpenRouter with a server-held key).
 * No API keys are ever referenced in the browser.
 */
export function buildAiTroubleshootPayload(
  points: MeasurementPoint[],
  th: RssiThresholds,
  context: { ssid: string | null; mode: string },
) {
  const stats = computeStats(points, th);
  return {
    context,
    stats,
    thresholds: th,
    findings: analyze(points, th),
    sample: points.slice(-40).map((p) => ({
      x: Number(p.x.toFixed(3)),
      y: Number(p.y.toFixed(3)),
      rssi: p.rssi,
      snr: p.snr,
      channel: p.channel,
      band: p.band,
      link_rate: p.link_rate,
      ping_ms: p.ping_ms ?? null,
      packet_loss: p.packet_loss ?? null,
    })),
  };
}
