export type ScannerStatus = "offline" | "connecting" | "online" | "error";
export type DataMode = "idle" | "demo" | "live";
export type SurveyState = "stopped" | "running" | "paused";
export type PositionSource = "manual" | "agent" | "demo" | "none";

export interface WifiSample {
  timestamp: string;
  ssid: string | null;
  bssid: string | null;
  rssi: number | null;
  snr: number | null;
  noise?: number | null;
  channel: number | null;
  frequency: number | null;
  band: string | null;
  link_rate: number | null;
  tx_rate: number | null;
  rx_rate: number | null;
  ping_ms?: number | null;
  download_mbps?: number | null;
  upload_mbps?: number | null;
  packet_loss?: number | null;
  security?: string | null;
  /** true only when produced by the demo simulator */
  simulated?: boolean;
}

export interface MeasurementPoint extends WifiSample {
  id: string;
  /** normalized floor-plan coordinates, 0..1 */
  x: number;
  y: number;
  source: PositionSource;
}

export interface NetworkEntry {
  ssid: string;
  bssid: string;
  rssi: number;
  channel: number;
  frequency: number;
  band: string;
  security: string;
  simulated?: boolean;
}

export interface AccessPoint {
  bssid: string;
  ssid: string;
  channel: number;
  band: string;
  frequency: number;
  rssi: number;
  history: { t: number; rssi: number }[];
  firstSeen: string;
  lastSeen: string;
  /** normalized floor-plan position, if placed by the user */
  x?: number;
  y?: number;
  simulated?: boolean;
}

export interface FloorPlan {
  name: string;
  /** data URL or object URL of the plan image */
  src: string | null;
  /** meters represented by the calibration segment */
  calibrationMeters: number | null;
  /** normalized length (0..1 of plan width) of the calibration segment */
  calibrationNormalizedLength: number | null;
  widthMeters: number | null;
}

export interface Obstacle {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  kind: "wall" | "glass" | "metal";
}

export type HeatmapLayer =
  | "rssi"
  | "snr"
  | "noise"
  | "channel"
  | "ap_coverage"
  | "link_rate"
  | "download"
  | "upload"
  | "ping"
  | "packet_loss";

export interface RssiThresholds {
  excellent: number;
  good: number;
  fair: number;
  weak: number;
}

export interface SurveyProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  mode: DataMode;
  floorPlan: FloorPlan;
  obstacles: Obstacle[];
  points: MeasurementPoint[];
  accessPoints: AccessPoint[];
  targetSsid: string | null;
  targetBssid: string | null;
  thresholds: RssiThresholds;
  layer: HeatmapLayer;
}

export interface Finding {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  metrics: { label: string; value: string }[];
  causes: string[];
  action: string;
}
