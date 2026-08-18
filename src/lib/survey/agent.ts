import type { NetworkEntry, WifiSample } from "./types";

export const DEFAULT_AGENT_URL = "http://127.0.0.1:8765";

/**
 * Client for the local NetDoc Wi-Fi agent (FastAPI, Python).
 * Expected REST endpoints:
 *   GET  /health
 *   GET  /wifi/current
 *   GET  /wifi/networks
 *   POST /wifi/scan
 *   GET  /wifi/interfaces
 * Expected WebSocket: ws://127.0.0.1:8765/ws
 *
 * Nothing here fabricates data — if the agent is unreachable the caller
 * is expected to surface "Scanner Offline".
 */
export function toWsUrl(httpUrl: string) {
  const trimmed = httpUrl.replace(/\/+$/, "");
  return trimmed.replace(/^http/, "ws") + "/ws";
}

async function req<T>(baseUrl: string, path: string, init?: RequestInit, timeoutMs = 4000) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(baseUrl.replace(/\/+$/, "") + path, {
      ...init,
      signal: ctrl.signal,
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) throw new Error(`${path} responded ${res.status}`);
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

export const agentApi = {
  health: (base: string) => req<{ status?: string; version?: string }>(base, "/health"),
  current: (base: string) => req<unknown>(base, "/wifi/current"),
  networks: (base: string) => req<unknown>(base, "/wifi/networks"),
  scan: (base: string) => req<unknown>(base, "/wifi/scan", { method: "POST" }, 12000),
  interfaces: (base: string) => req<unknown>(base, "/wifi/interfaces"),
};

const num = (v: unknown): number | null =>
  typeof v === "number" && Number.isFinite(v)
    ? v
    : typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))
      ? Number(v)
      : null;

const str = (v: unknown): string | null => (typeof v === "string" && v ? v : null);

export function bandFromFrequency(freq: number | null): string | null {
  if (freq == null) return null;
  if (freq >= 5925) return "6 GHz";
  if (freq >= 4900) return "5 GHz";
  if (freq >= 2400) return "2.4 GHz";
  return null;
}

/** Validates & normalizes an incoming agent payload. Missing fields become null. */
export function parseWifiSample(raw: unknown): WifiSample | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const frequency = num(d["frequency"]);
  const rssi = num(d["rssi"]);
  const snr = num(d["snr"]);
  const noise = num(d["noise"]) ?? (rssi != null && snr != null ? rssi - snr : null);
  if (rssi == null && str(d["ssid"]) == null) return null;
  return {
    timestamp: str(d["timestamp"]) ?? new Date().toISOString(),
    ssid: str(d["ssid"]),
    bssid: str(d["bssid"]),
    rssi,
    snr: snr ?? (rssi != null && noise != null ? rssi - noise : null),
    noise,
    channel: num(d["channel"]),
    frequency,
    band: str(d["band"]) ?? bandFromFrequency(frequency),
    link_rate: num(d["link_rate"]),
    tx_rate: num(d["tx_rate"]),
    rx_rate: num(d["rx_rate"]),
    ping_ms: num(d["ping_ms"] ?? d["ping"]),
    download_mbps: num(d["download_mbps"] ?? d["download"]),
    upload_mbps: num(d["upload_mbps"] ?? d["upload"]),
    packet_loss: num(d["packet_loss"]),
    security: str(d["security"]),
    simulated: false,
  };
}

export function parseNetworks(raw: unknown): NetworkEntry[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as Record<string, unknown>)["networks"])
      ? ((raw as Record<string, unknown>)["networks"] as unknown[])
      : [];
  const out: NetworkEntry[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const d = item as Record<string, unknown>;
    const bssid = str(d["bssid"]);
    const rssi = num(d["rssi"]);
    if (!bssid || rssi == null) continue;
    const frequency = num(d["frequency"]) ?? 0;
    out.push({
      ssid: str(d["ssid"]) ?? "(hidden)",
      bssid,
      rssi,
      channel: num(d["channel"]) ?? 0,
      frequency,
      band: str(d["band"]) ?? bandFromFrequency(frequency) ?? "—",
      security: str(d["security"]) ?? "Unknown",
      simulated: false,
    });
  }
  return out;
}

export type AgentSocketHandlers = {
  onOpen: () => void;
  onSample: (s: WifiSample) => void;
  onNetworks: (n: NetworkEntry[]) => void;
  onClose: (reason: string) => void;
};

export function openAgentSocket(baseUrl: string, h: AgentSocketHandlers) {
  let ws: WebSocket;
  try {
    ws = new WebSocket(toWsUrl(baseUrl));
  } catch {
    h.onClose("Invalid agent URL");
    return { close: () => {} };
  }
  ws.onopen = () => h.onOpen();
  ws.onerror = () => {};
  ws.onclose = (e) => h.onClose(e.reason || "Connection closed");
  ws.onmessage = (event) => {
    let payload: unknown;
    try {
      payload = JSON.parse(String(event.data));
    } catch {
      return;
    }
    const type =
      payload && typeof payload === "object"
        ? String((payload as Record<string, unknown>)["type"] ?? "")
        : "";
    if (type === "wifi_networks") {
      h.onNetworks(parseNetworks((payload as Record<string, unknown>)["networks"] ?? payload));
      return;
    }
    if (type === "wifi_measurement" || type === "") {
      const sample = parseWifiSample(payload);
      if (sample) h.onSample(sample);
    }
  };
  return { close: () => ws.close() };
}
