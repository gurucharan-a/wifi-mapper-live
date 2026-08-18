import { Link } from "@tanstack/react-router";
import { FolderOpen, Save, Settings2, SignalHigh } from "lucide-react";
import type { ReactNode } from "react";

import { ConnectionStatus } from "@/components/netdoc/ConnectionStatus";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSurvey } from "@/lib/survey/store";

const NAV = [
  { to: "/survey", label: "Live Survey" },
  { to: "/heatmap", label: "Heatmap" },
  { to: "/networks", label: "Networks" },
  { to: "/access-points", label: "Access Points" },
  { to: "/analytics", label: "Analytics" },
  { to: "/reports", label: "Reports" },
  { to: "/troubleshoot", label: "Troubleshoot" },
] as const;

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  const { mode, saveProject, projectName } = useSurvey();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-[1700px] flex-wrap items-center gap-3 px-4 py-2.5">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/50 bg-primary/10 text-primary">
              <SignalHigh className="h-4.5 w-4.5" />
            </span>
            <span className="font-display text-sm leading-tight font-semibold tracking-tight">
              NetDoc
              <span className="block text-[10px] font-normal tracking-[0.2em] text-muted-foreground uppercase">WiFi Survey</span>
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-0.5">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <ConnectionStatus />
            <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs" onClick={() => void saveProject()}>
              <Save className="h-3.5 w-3.5" /> Save
            </Button>
            <Link to="/projects">
              <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
                <FolderOpen className="h-3.5 w-3.5" /> Projects
              </Button>
            </Link>
            <Link to="/scanner">
              <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                <Settings2 className="h-3.5 w-3.5" /> Scanner
              </Button>
            </Link>
          </div>
        </div>
        {mode === "demo" ? (
          <div className="bg-[var(--demo)]/12 py-1 text-center text-[11px] font-semibold tracking-[0.2em] text-[var(--demo)] uppercase">
            Demo mode — simulated data
          </div>
        ) : null}
      </header>

      <main className={cn("mx-auto max-w-[1700px] px-4 py-4")}>
        <div className="mb-3 flex flex-wrap items-baseline gap-3">
          <h1 className="text-xl font-semibold">{title}</h1>
          <span className="text-xs text-muted-foreground">{projectName}</span>
        </div>
        {children}
      </main>
    </div>
  );
}
