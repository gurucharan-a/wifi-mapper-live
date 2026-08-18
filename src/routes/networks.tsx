import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/netdoc/AppShell";
import { NetworkTable } from "@/components/netdoc/NetworkTable";
import { useSurvey } from "@/lib/survey/store";

export const Route = createFileRoute("/networks")({
  head: () => ({
    meta: [
      { title: "Wi-Fi Networks — NetDoc WiFi Survey" },
      { name: "description", content: "Browse detected Wi-Fi networks with BSSID, channel, band, security and signal quality, and pick a survey target." },
      { property: "og:title", content: "Wi-Fi Networks — NetDoc" },
      { property: "og:description", content: "Detected SSIDs, BSSIDs, channels, bands and signal quality from the local Wi-Fi agent." },
    ],
  }),
  component: NetworksPage,
});

function NetworksPage() {
  const { targetSsid, targetBssid } = useSurvey();
  return (
    <AppShell title="Networks">
      <div className="space-y-3">
        <div className="panel-surface p-3 text-xs">
          <span className="label-caps mr-2">Survey target</span>
          <span className="mono-num text-foreground">{targetSsid ? `${targetSsid} · ${targetBssid ?? "any BSSID"}` : "None selected"}</span>
        </div>
        <NetworkTable />
      </div>
    </AppShell>
  );
}
