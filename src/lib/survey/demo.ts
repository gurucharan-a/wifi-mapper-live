import type { AccessPoint, NetworkEntry, WifiSample } from "./types";

/** Simulated access points placed on the normalized floor plan. */
export const DEMO_APS: { bssid: string; ssid: string; channel: number; band: string; frequency: number; x: number; y: number }[] =
  [
    { bssid: "A4:2B:B0:11:20:01", ssid: "NetDoc-Corp", channel: 36, band: "5 GHz", frequency: 5180, x: 0.22, y: 0.24 },
    { bssid: "A4:2B:B0:11:20:02", ssid: "NetDoc-Corp", channel: 44, band: "5 GHz", frequency: 5220, x: 0.74, y: 0.3 },
    { bssid: "A4:2B:B0:11:20:03", ssid: "NetDoc-Corp", channel: 6, band: "2.4 GHz", frequency: 2437, x: 0.52, y: 0.78 },
  ];

const NEIGHBOURS: NetworkEntry[] = [
  { ssid: "NetDoc-Guest", bssid: "A4:2B:B0:11:20:11", rssi: -61, channel: 40, frequency: 5200, band: "5 GHz", security: "WPA2-PSK", simulated: true },
  { ssid: "Floor3-IoT", bssid: "C8:3A:35:9F:14:80", rssi: -72, channel: 11, frequency: 2462, band: "2.4 GHz", security: "WPA2-PSK", simulated: true },
  { ssid: "CAFE-PUBLIC", bssid: "18:0F:76:22:AB:31", rssi: -79, channel: 6, frequency: 2437, band: "2.4 GHz", security: "Open", simulated: true },
  { ssid: "TP-LINK_4A22", bssid: "50:C7:BF:4A:22:10", rssi: -83, channel: 6, frequency: 2437, band: "2.4 GHz", security: "WPA2-PSK", simulated: true },
  { ssid: "ENG-LAB-6E", bssid: "F0:9F:C2:70:5C:aa", rssi: -66, channel: 37, frequency: 6135, band: "6 GHz", security: "WPA3-SAE", simulated: true },
];

function noise(seed: number) {
  return Math.sin(seed * 12.9898) * 43758.5453 % 1;
}

/** Log-distance path loss with a couple of simulated obstruction zones. */
export function simulatedRssiAt(x: number, y: number, ap: { x: number; y: number; band: string }) {
  const d = Math.hypot(x - ap.x, y - ap.y) * 30 + 1; // ~30 m across the plan
  const n = ap.band === "2.4 GHz" ? 2.6 : 3.0;
  const ref = ap.band === "2.4 GHz" ? -38 : -34;
  let rssi = ref - 10 * n * Math.log10(d);
  // simulated concrete core / dead-zone corner
  if (x > 0.42 && x < 0.6 && y > 0.15 && y < 0.55) rssi -= 12;
  if (x > 0.82 && y > 0.7) rssi -= 18;
  rssi += (Math.random() - 0.5) * 2.5;
  return Math.max(-95, Math.min(-25, rssi));
}

export function bestDemoAp(x: number, y: number) {
  let best = DEMO_APS[0]!;
  let bestRssi = -999;
  for (const ap of DEMO_APS) {
    const r = simulatedRssiAt(x, y, ap);
    if (r > bestRssi) {
      bestRssi = r;
      best = ap;
    }
  }
  return { ap: best, rssi: bestRssi };
}

export function demoSampleAt(x: number, y: number): WifiSample {
  const { ap, rssi } = bestDemoAp(x, y);
  const floorNoise = -96 + Math.random() * 3 + (ap.band === "2.4 GHz" ? 4 : 0);
  const snr = Math.max(2, Math.round(rssi - floorNoise));
  const quality = Math.max(0, Math.min(1, (rssi + 90) / 55));
  const maxRate = ap.band === "2.4 GHz" ? 300 : 1200;
  const linkRate = Math.round(Math.max(6, maxRate * Math.pow(quality, 1.5)));
  return {
    timestamp: new Date().toISOString(),
    ssid: ap.ssid,
    bssid: ap.bssid,
    rssi: Math.round(rssi),
    snr,
    noise: Math.round(floorNoise),
    channel: ap.channel,
    frequency: ap.frequency,
    band: ap.band,
    link_rate: linkRate,
    tx_rate: linkRate,
    rx_rate: Math.round(linkRate * (0.85 + Math.random() * 0.15)),
    ping_ms: Math.round(6 + (1 - quality) * 90 + Math.random() * 6),
    download_mbps: Math.round(linkRate * 0.55 * (0.8 + Math.random() * 0.2)),
    upload_mbps: Math.round(linkRate * 0.32 * (0.8 + Math.random() * 0.2)),
    packet_loss: Number((Math.max(0, (0.45 - quality) * 12) * Math.random()).toFixed(1)),
    security: "WPA2-PSK",
    simulated: true,
  };
}

export function demoNetworks(x = 0.5, y = 0.5): NetworkEntry[] {
  const primaries = DEMO_APS.map((ap) => ({
    ssid: ap.ssid,
    bssid: ap.bssid,
    rssi: Math.round(simulatedRssiAt(x, y, ap)),
    channel: ap.channel,
    frequency: ap.frequency,
    band: ap.band,
    security: "WPA2-PSK",
    simulated: true,
  }));
  return [...primaries, ...NEIGHBOURS.map((n) => ({ ...n, rssi: n.rssi + Math.round(noise(n.rssi) * 3) }))];
}

export function demoAccessPoints(): AccessPoint[] {
  const now = new Date().toISOString();
  return DEMO_APS.map((ap) => ({
    bssid: ap.bssid,
    ssid: ap.ssid,
    channel: ap.channel,
    band: ap.band,
    frequency: ap.frequency,
    rssi: -55,
    history: [],
    firstSeen: now,
    lastSeen: now,
    x: ap.x,
    y: ap.y,
    simulated: true,
  }));
}

/** Serpentine walking path across the plan. */
export function demoWalkPoint(step: number): { x: number; y: number } {
  const legs = 5;
  const total = 260;
  const t = (step % total) / total;
  const leg = Math.min(legs - 1, Math.floor(t * legs));
  const legT = (t * legs) % 1;
  const y = 0.12 + (leg / (legs - 1)) * 0.76;
  const x = leg % 2 === 0 ? 0.1 + legT * 0.8 : 0.9 - legT * 0.8;
  return { x, y: y + Math.sin(legT * Math.PI * 2) * 0.012 };
}
