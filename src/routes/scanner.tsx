import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/netdoc/AppShell";
import { ScannerConnectionPanel } from "@/components/netdoc/ScannerConnectionPanel";

export const Route = createFileRoute("/scanner")({
  head: () => ({
    meta: [
      { title: "Scanner Settings — NetDoc WiFi Survey" },
      { name: "description", content: "Connect NetDoc to the local FastAPI Wi-Fi agent on 127.0.0.1:8765 over REST and WebSocket." },
      { property: "og:title", content: "Scanner Settings — NetDoc" },
      { property: "og:description", content: "Configure and test the local Wi-Fi agent connection used for real hardware measurements." },
    ],
  }),
  component: () => (
    <AppShell title="Scanner Settings">
      <ScannerConnectionPanel />
    </AppShell>
  ),
});
