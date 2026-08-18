import { ArrowDownToLine, ArrowUpFromLine, Gauge, Radio, Router, Signal, Timer, Waves, Zap } from "lucide-react";

import { WifiMetricCard } from "@/components/netdoc/WifiMetricCard";
import { rssiCategory } from "@/lib/survey/heatmap";
import { useSurvey } from "@/lib/survey/store";

export function MetricGrid() {
  const { current, thresholds, mode } = useSurvey();
  const sim = current?.simulated === true;
  const rssiTone = current?.rssi != null ? (rssiCategory(current.rssi, thresholds).key as never) : "default";
  const snrTone = current?.snr == null ? "default" : current.snr >= 30 ? "excellent" : current.snr >= 20 ? "good" : current.snr >= 12 ? "fair" : "weak";
  const hint = mode === "idle" ? "Scanner Offline" : undefined;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
      <WifiMetricCard label="RSSI" value={current?.rssi ?? null} unit="dBm" tone={rssiTone} simulated={sim} icon={<Signal className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="SNR" value={current?.snr ?? null} unit="dB" tone={snrTone} simulated={sim} icon={<Waves className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Link Rate" value={current?.link_rate ?? null} unit="Mbps" simulated={sim} icon={<Zap className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="TX Rate" value={current?.tx_rate ?? null} unit="Mbps" simulated={sim} icon={<ArrowUpFromLine className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="RX Rate" value={current?.rx_rate ?? null} unit="Mbps" simulated={sim} icon={<ArrowDownToLine className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Channel" value={current?.channel ?? null} simulated={sim} icon={<Router className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Frequency" value={current?.frequency ?? null} unit="MHz" simulated={sim} icon={<Radio className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Band" value={current?.band ?? null} simulated={sim} icon={<Radio className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Ping" value={current?.ping_ms ?? null} unit="ms" simulated={sim} icon={<Timer className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Download" value={current?.download_mbps ?? null} unit="Mbps" simulated={sim} icon={<ArrowDownToLine className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Upload" value={current?.upload_mbps ?? null} unit="Mbps" simulated={sim} icon={<ArrowUpFromLine className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
      <WifiMetricCard label="Packet Loss" value={current?.packet_loss ?? null} unit="%" digits={1} simulated={sim} icon={<Gauge className="h-3.5 w-3.5" />} {...(hint ? { hint } : {})} />
    </div>
  );
}
