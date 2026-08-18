import type { HeatmapLayer, MeasurementPoint, RssiThresholds } from "./types";

export const DEFAULT_THRESHOLDS: RssiThresholds = {
  excellent: -50,
  good: -60,
  fair: -70,
  weak: -80,
};

export const LAYERS: { id: HeatmapLayer; label: string; unit: string }[] = [
  { id: "rssi", label: "Signal Strength (RSSI)", unit: "dBm" },
  { id: "snr", label: "SNR", unit: "dB" },
  { id: "noise", label: "Noise Floor", unit: "dBm" },
  { id: "channel", label: "Channel", unit: "" },
  { id: "ap_coverage", label: "AP Coverage", unit: "dBm" },
  { id: "link_rate", label: "Link Rate", unit: "Mbps" },
  { id: "download", label: "Download Speed", unit: "Mbps" },
  { id: "upload", label: "Upload Speed", unit: "Mbps" },
  { id: "ping", label: "Ping", unit: "ms" },
  { id: "packet_loss", label: "Packet Loss", unit: "%" },
];

export function layerValue(p: MeasurementPoint, layer: HeatmapLayer): number | null {
  switch (layer) {
    case "rssi":
    case "ap_coverage":
      return p.rssi;
    case "snr":
      return p.snr;
    case "noise":
      return p.noise ?? (p.rssi != null && p.snr != null ? p.rssi - p.snr : null);
    case "channel":
      return p.channel;
    case "link_rate":
      return p.link_rate;
    case "download":
      return p.download_mbps ?? null;
    case "upload":
      return p.upload_mbps ?? null;
    case "ping":
      return p.ping_ms ?? null;
    case "packet_loss":
      return p.packet_loss ?? null;
  }
}

/** [min, max] plus whether higher values are better. */
export function layerScale(layer: HeatmapLayer): { min: number; max: number; higherIsBetter: boolean } {
  switch (layer) {
    case "rssi":
    case "ap_coverage":
      return { min: -90, max: -35, higherIsBetter: true };
    case "snr":
      return { min: 5, max: 45, higherIsBetter: true };
    case "noise":
      return { min: -98, max: -80, higherIsBetter: false };
    case "channel":
      return { min: 1, max: 165, higherIsBetter: true };
    case "link_rate":
      return { min: 6, max: 1200, higherIsBetter: true };
    case "download":
      return { min: 0, max: 700, higherIsBetter: true };
    case "upload":
      return { min: 0, max: 400, higherIsBetter: true };
    case "ping":
      return { min: 5, max: 120, higherIsBetter: false };
    case "packet_loss":
      return { min: 0, max: 10, higherIsBetter: false };
  }
}

type RGB = [number, number, number];

const RAMP: { t: number; c: RGB }[] = [
  { t: 0, c: [200, 45, 45] },
  { t: 0.28, c: [225, 122, 42] },
  { t: 0.52, c: [222, 194, 60] },
  { t: 0.76, c: [120, 200, 92] },
  { t: 1, c: [38, 190, 150] },
];

const CHANNEL_COLORS: RGB[] = [
  [79, 172, 254],
  [56, 199, 160],
  [230, 180, 70],
  [214, 106, 78],
  [160, 122, 220],
  [86, 200, 226],
];

export function rampColor(t: number): RGB {
  const v = Math.max(0, Math.min(1, t));
  for (let i = 0; i < RAMP.length - 1; i++) {
    const a = RAMP[i]!;
    const b = RAMP[i + 1]!;
    if (v >= a.t && v <= b.t) {
      const k = (v - a.t) / (b.t - a.t || 1);
      return [
        Math.round(a.c[0] + (b.c[0] - a.c[0]) * k),
        Math.round(a.c[1] + (b.c[1] - a.c[1]) * k),
        Math.round(a.c[2] + (b.c[2] - a.c[2]) * k),
      ];
    }
  }
  return RAMP[RAMP.length - 1]!.c;
}

export function rssiCategory(rssi: number, th: RssiThresholds) {
  if (rssi >= th.excellent) return { key: "excellent", label: "Excellent", color: "var(--signal-excellent)" };
  if (rssi >= th.good) return { key: "good", label: "Good", color: "var(--signal-good)" };
  if (rssi >= th.fair) return { key: "fair", label: "Fair", color: "var(--signal-fair)" };
  if (rssi >= th.weak) return { key: "weak", label: "Weak", color: "var(--signal-weak)" };
  return { key: "dead", label: "Dead Zone", color: "var(--signal-dead)" };
}

export interface HeatmapOptions {
  layer: HeatmapLayer;
  points: MeasurementPoint[];
  thresholds: RssiThresholds;
  opacity: number;
  /** grid resolution along the longest edge */
  resolution?: number;
  /** inverse distance weighting exponent */
  power?: number;
  /** max normalized influence radius */
  radius?: number;
}

/**
 * Renders an IDW-interpolated heatmap of REAL measurement points onto a canvas.
 * Cells further than `radius` from every sample stay transparent — we never
 * invent coverage where nothing was measured.
 */
export function renderHeatmap(canvas: HTMLCanvasElement, opts: HeatmapOptions) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const w = canvas.width;
  const h = canvas.height;
  ctx.clearRect(0, 0, w, h);

  const samples = opts.points
    .map((p) => ({ x: p.x, y: p.y, v: layerValue(p, opts.layer) }))
    .filter((s): s is { x: number; y: number; v: number } => s.v != null);
  if (samples.length === 0) return;

  const res = opts.resolution ?? 110;
  const cols = res;
  const rows = Math.max(8, Math.round((res * h) / Math.max(1, w)));
  const cellW = w / cols;
  const cellH = h / rows;
  const power = opts.power ?? 2.4;
  const radius = opts.radius ?? 0.26;
  const scale = layerScale(opts.layer);
  const isChannel = opts.layer === "channel";

  ctx.globalAlpha = opts.opacity;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const nx = (c + 0.5) / cols;
      const ny = (r + 0.5) / rows;
      let wsum = 0;
      let vsum = 0;
      let nearest = Infinity;
      let nearestV = 0;
      for (const s of samples) {
        const d = Math.hypot(nx - s.x, ny - s.y);
        if (d < nearest) {
          nearest = d;
          nearestV = s.v;
        }
        if (d > radius) continue;
        const wgt = 1 / Math.pow(Math.max(d, 0.004), power);
        wsum += wgt;
        vsum += wgt * s.v;
      }
      if (wsum === 0) continue;
      const value = isChannel ? nearestV : vsum / wsum;
      let rgb: RGB;
      if (isChannel) {
        rgb = CHANNEL_COLORS[Math.abs(Math.round(value)) % CHANNEL_COLORS.length]!;
      } else {
        let t = (value - scale.min) / (scale.max - scale.min);
        if (!scale.higherIsBetter) t = 1 - t;
        rgb = rampColor(t);
      }
      const fade = Math.max(0, Math.min(1, 1 - (nearest - radius * 0.55) / (radius * 0.45)));
      ctx.globalAlpha = opts.opacity * (0.35 + 0.65 * fade);
      ctx.fillStyle = `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
      ctx.fillRect(c * cellW - 0.5, r * cellH - 0.5, cellW + 1, cellH + 1);
    }
  }
  ctx.globalAlpha = 1;
}

export function formatLayerValue(layer: HeatmapLayer, v: number | null) {
  if (v == null) return "—";
  const unit = LAYERS.find((l) => l.id === layer)?.unit ?? "";
  return `${Math.round(v * 10) / 10}${unit ? ` ${unit}` : ""}`;
}
