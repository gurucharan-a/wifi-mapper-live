import type { MeasurementPoint, SurveyProject } from "./types";

export function download(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CSV_COLUMNS = [
  "timestamp",
  "x",
  "y",
  "source",
  "ssid",
  "bssid",
  "rssi",
  "snr",
  "noise",
  "channel",
  "frequency",
  "band",
  "link_rate",
  "tx_rate",
  "rx_rate",
  "ping_ms",
  "download_mbps",
  "upload_mbps",
  "packet_loss",
  "simulated",
] as const;

export function pointsToCsv(points: MeasurementPoint[]) {
  const rows = points.map((p) =>
    CSV_COLUMNS.map((c) => {
      const v = (p as unknown as Record<string, unknown>)[c];
      if (v == null) return "";
      const s = String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    }).join(","),
  );
  return [CSV_COLUMNS.join(","), ...rows].join("\n");
}

export function exportCsv(project: SurveyProject) {
  download(`${slug(project.name)}-measurements.csv`, pointsToCsv(project.points), "text/csv");
}

export function exportJson(project: SurveyProject, extra: Record<string, unknown> = {}) {
  download(
    `${slug(project.name)}-survey.json`,
    JSON.stringify({ ...project, ...extra }, null, 2),
    "application/json",
  );
}

export function exportCanvasPng(canvas: HTMLCanvasElement, name: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug(name)}-heatmap.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}

export function slug(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "netdoc-survey";
}
