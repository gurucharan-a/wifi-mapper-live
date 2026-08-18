import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/netdoc/AppShell";
import { TroubleshootingPanel } from "@/components/netdoc/TroubleshootingPanel";

export const Route = createFileRoute("/troubleshoot")({
  head: () => ({
    meta: [
      { title: "Wi-Fi Troubleshooting — NetDoc WiFi Survey" },
      { name: "description", content: "Detect dead zones, low SNR, high noise, channel congestion, latency and packet loss from recorded survey data." },
      { property: "og:title", content: "Wi-Fi Troubleshooting — NetDoc" },
      { property: "og:description", content: "Automated analysis of dead zones, interference and link quality issues." },
    ],
  }),
  component: () => (
    <AppShell title="Troubleshoot">
      <TroubleshootingPanel />
    </AppShell>
  ),
});
