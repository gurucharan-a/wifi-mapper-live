import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/netdoc/AppShell";
import { ReportGenerator } from "@/components/netdoc/ReportGenerator";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Survey Reports — NetDoc WiFi Survey" },
      { name: "description", content: "Generate and export Wi-Fi site survey reports as CSV, JSON, PNG heatmap or printable document." },
      { property: "og:title", content: "Survey Reports — NetDoc" },
      { property: "og:description", content: "Export coverage statistics, findings and heatmaps from your Wi-Fi site survey." },
    ],
  }),
  component: () => (
    <AppShell title="Reports">
      <ReportGenerator />
    </AppShell>
  ),
});
