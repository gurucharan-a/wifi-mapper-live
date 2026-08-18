import { createFileRoute } from "@tanstack/react-router";
import { FilePlus2, FolderOpen, Save, Trash2 } from "lucide-react";

import { AppShell } from "@/components/netdoc/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSurvey } from "@/lib/survey/store";

export const Route = createFileRoute("/projects")({
  head: () => ({
    meta: [
      { title: "Survey Projects — NetDoc WiFi Survey" },
      { name: "description", content: "Create, open, save and delete Wi-Fi survey projects including floor plan, calibration and measurement data." },
      { property: "og:title", content: "Survey Projects — NetDoc" },
      { property: "og:description", content: "Manage saved Wi-Fi site survey projects and their measurement data." },
    ],
  }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const { projects, newProject, saveProject, openProject, deleteProject, projectName, setProjectName, points } = useSurvey();

  return (
    <AppShell title="Projects">
      <div className="space-y-3">
        <div className="panel-surface flex flex-wrap items-center gap-2 p-3">
          <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-9 max-w-xs" placeholder="Project name" />
          <Button className="h-9 gap-2" onClick={() => void saveProject()}>
            <Save className="h-4 w-4" /> Save Project
          </Button>
          <Button variant="outline" className="h-9 gap-2" onClick={() => newProject()}>
            <FilePlus2 className="h-4 w-4" /> New Project
          </Button>
          <span className="ml-auto text-xs text-muted-foreground">
            {points.length} measurement(s) in the current session · stored locally in this browser
          </span>
        </div>

        {projects.length === 0 ? (
          <div className="panel-surface p-10 text-center text-sm text-muted-foreground">No saved projects yet.</div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => (
              <div key={p.id} className="panel-surface space-y-2 p-3">
                <div className="flex items-start gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{p.name}</div>
                    <div className="text-[11px] text-muted-foreground">Updated {new Date(p.updatedAt).toLocaleString()}</div>
                  </div>
                  <span
                    className="ml-auto rounded-sm px-1.5 py-0.5 text-[9px] font-semibold tracking-wide uppercase"
                    style={{
                      background: p.mode === "demo" ? "color-mix(in oklch, var(--demo) 15%, transparent)" : "var(--muted)",
                      color: p.mode === "demo" ? "var(--demo)" : "var(--muted-foreground)",
                    }}
                  >
                    {p.mode === "demo" ? "simulated" : p.mode === "live" ? "real data" : "empty"}
                  </span>
                </div>
                <div className="mono-num grid grid-cols-3 gap-2 text-[11px] text-muted-foreground">
                  <span>{p.points.length} pts</span>
                  <span>{p.accessPoints.length} APs</span>
                  <span>{p.targetSsid ?? "no SSID"}</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="h-8 flex-1 gap-1.5 text-xs" onClick={() => void openProject(p.id)}>
                    <FolderOpen className="h-3.5 w-3.5" /> Open
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 gap-1.5 text-xs text-destructive" onClick={() => void deleteProject(p.id)}>
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
