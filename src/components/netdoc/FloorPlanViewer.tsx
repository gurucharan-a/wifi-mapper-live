import { Crosshair, Hand, Maximize2, MapPin, Minus, Plus, Radio, Ruler, Square } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { layerValue, renderHeatmap, rssiCategory } from "@/lib/survey/heatmap";
import { useSurvey } from "@/lib/survey/store";

type Tool = "position" | "pan" | "ap" | "wall" | "calibrate";

const TOOLS: { id: Tool; label: string; icon: typeof Hand }[] = [
  { id: "position", label: "Set position", icon: Crosshair },
  { id: "pan", label: "Pan", icon: Hand },
  { id: "ap", label: "Place AP", icon: Radio },
  { id: "wall", label: "Draw wall", icon: Square },
  { id: "calibrate", label: "Calibrate", icon: Ruler },
];

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 8;

export function FloorPlanViewer({
  showHeatmap = true,
  showPoints = true,
  className,
  canvasRef: externalCanvasRef,
}: {
  showHeatmap?: boolean;
  showPoints?: boolean;
  className?: string;
  canvasRef?: React.MutableRefObject<HTMLCanvasElement | null>;
}) {
  const {
    floorPlan,
    setCalibration,
    points,
    layer,
    thresholds,
    heatmapOpacity,
    position,
    setManualPosition,
    accessPoints,
    placeAccessPoint,
    obstacles,
    addObstacle,
    focusedApBssid,
    mode,
  } = useSurvey();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const localCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [tool, setTool] = useState<Tool>("position");
  const [view, setView] = useState({ zoom: 1, x: 0, y: 0 });
  const [drag, setDrag] = useState<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const [pending, setPending] = useState<{ x: number; y: number } | null>(null);

  const visiblePoints = useMemo(
    () => (focusedApBssid ? points.filter((p) => p.bssid === focusedApBssid) : points),
    [points, focusedApBssid],
  );

  /* ---------- heatmap rendering ---------- */
  const draw = useCallback(() => {
    const canvas = localCanvasRef.current;
    const stage = stageRef.current;
    if (!canvas || !stage) return;
    const rect = stage.getBoundingClientRect();
    const w = Math.max(1, Math.round(rect.width / Math.max(view.zoom, 0.01)));
    const h = Math.max(1, Math.round(rect.height / Math.max(view.zoom, 0.01)));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    renderHeatmap(canvas, {
      layer,
      points: showHeatmap ? visiblePoints : [],
      thresholds,
      opacity: heatmapOpacity,
    });
    if (externalCanvasRef) externalCanvasRef.current = canvas;
  }, [layer, visiblePoints, thresholds, heatmapOpacity, showHeatmap, view.zoom, externalCanvasRef]);

  useEffect(() => {
    draw();
  }, [draw]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => draw());
    ro.observe(el);
    return () => ro.disconnect();
  }, [draw]);

  /* ---------- wheel zoom (non-passive) ---------- */
  const wheelRef = useRef<(e: WheelEvent) => void>(() => {});
  wheelRef.current = (e: WheelEvent) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const py = e.clientY - rect.top;
    setView((v) => {
      const dy = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 100 : 1);
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * Math.exp(-dy * 0.0018)));
      const k = next / v.zoom;
      return { zoom: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      wheelRef.current(e);
    };
    el.addEventListener("wheel", handler, { passive: false });
    return () => el.removeEventListener("wheel", handler);
  }, []);

  const zoomBy = (factor: number) =>
    setView((v) => {
      const el = containerRef.current;
      const rect = el?.getBoundingClientRect();
      const px = (rect?.width ?? 0) / 2;
      const py = (rect?.height ?? 0) / 2;
      const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, v.zoom * factor));
      const k = next / v.zoom;
      return { zoom: next, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });

  const resetView = () => setView({ zoom: 1, x: 0, y: 0 });

  /* ---------- pointer interaction ---------- */
  const toNormalized = (clientX: number, clientY: number) => {
    const stage = stageRef.current;
    if (!stage) return null;
    const rect = stage.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return null;
    return { x, y };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (tool === "pan" || e.button === 1 || e.shiftKey) {
      (e.target as Element).setPointerCapture?.(e.pointerId);
      setDrag({ x: e.clientX, y: e.clientY, vx: view.x, vy: view.y });
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setView((v) => ({ ...v, x: drag.vx + (e.clientX - drag.x), y: drag.vy + (e.clientY - drag.y) }));
  };
  const onPointerUp = () => setDrag(null);

  const onClick = (e: React.MouseEvent) => {
    if (drag || tool === "pan") return;
    const pos = toNormalized(e.clientX, e.clientY);
    if (!pos) return;

    if (tool === "position") {
      setManualPosition(pos.x, pos.y);
      return;
    }
    if (tool === "ap") {
      const unplaced = accessPoints.find((a) => a.x == null);
      if (!unplaced) {
        toast.message("No unplaced access points", { description: "Detected APs already have a position." });
        return;
      }
      placeAccessPoint(unplaced.bssid, pos.x, pos.y);
      toast.success(`Placed ${unplaced.ssid} (${unplaced.bssid.slice(-5)})`);
      return;
    }
    if (tool === "wall" || tool === "calibrate") {
      if (!pending) {
        setPending(pos);
        return;
      }
      if (tool === "wall") {
        addObstacle({ x1: pending.x, y1: pending.y, x2: pos.x, y2: pos.y, kind: "wall" });
      } else {
        const len = Math.hypot(pos.x - pending.x, pos.y - pending.y);
        const input = window.prompt("Real-world length of this segment, in meters:", "5");
        const meters = input ? Number(input) : NaN;
        if (Number.isFinite(meters) && meters > 0 && len > 0.001) {
          setCalibration(meters, len);
          toast.success(`Calibrated: plan width ≈ ${(meters / len).toFixed(1)} m`);
        }
      }
      setPending(null);
    }
  };

  const gridBg =
    "repeating-linear-gradient(0deg, var(--grid) 0 1px, transparent 1px 40px), repeating-linear-gradient(90deg, var(--grid) 0 1px, transparent 1px 40px)";

  return (
    <div className={cn("panel-surface relative flex min-h-[420px] flex-col overflow-hidden", className)}>
      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border/70 bg-panel/70 px-2 py-1.5">
        {TOOLS.map((t) => (
          <Button
            key={t.id}
            size="sm"
            variant={tool === t.id ? "secondary" : "ghost"}
            className="h-7 gap-1.5 px-2 text-xs"
            onClick={() => {
              setTool(t.id);
              setPending(null);
            }}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </Button>
        ))}
        <div className="ml-auto flex items-center gap-1">
          <span className="mono-num mr-1 text-[11px] text-muted-foreground">{Math.round(view.zoom * 100)}%</span>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => zoomBy(1 / 1.25)} aria-label="Zoom out">
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => zoomBy(1.25)} aria-label="Zoom in">
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={resetView} aria-label="Reset view">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* viewport */}
      <div
        ref={containerRef}
        className={cn(
          "relative flex-1 overflow-hidden bg-[oklch(0.15_0.014_250)]",
          tool === "pan" ? (drag ? "cursor-grabbing" : "cursor-grab") : "cursor-crosshair",
        )}
        style={{ touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onClick={onClick}
      >
        <div
          ref={stageRef}
          className="absolute top-0 left-0 h-full w-full origin-top-left"
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})` }}
        >
          {floorPlan.src ? (
            <img src={floorPlan.src} alt={`Floor plan: ${floorPlan.name}`} className="h-full w-full object-contain opacity-90" draggable={false} />
          ) : (
            <div className="absolute inset-0" style={{ backgroundImage: gridBg, backgroundSize: "40px 40px" }} />
          )}

          <canvas ref={localCanvasRef} className="pointer-events-none absolute inset-0 h-full w-full mix-blend-screen" />

          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 1 1" preserveAspectRatio="none">
            {obstacles.map((o) => (
              <line
                key={o.id}
                x1={o.x1}
                y1={o.y1}
                x2={o.x2}
                y2={o.y2}
                stroke="var(--foreground)"
                strokeOpacity={0.65}
                strokeWidth={0.006}
                vectorEffect="non-scaling-stroke"
              />
            ))}
            {pending ? <circle cx={pending.x} cy={pending.y} r={0.006} fill="var(--primary)" /> : null}
          </svg>

          {/* measurement points */}
          {showPoints &&
            visiblePoints.slice(-600).map((p) => {
              const v = layerValue(p, layer);
              const cat = p.rssi != null ? rssiCategory(p.rssi, thresholds) : null;
              return (
                <span
                  key={p.id}
                  title={`${p.ssid ?? "—"} · ${v ?? "—"}`}
                  className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full ring-1 ring-black/40"
                  style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, background: cat?.color ?? "var(--primary)" }}
                />
              );
            })}

          {/* access points */}
          {accessPoints
            .filter((a) => a.x != null && a.y != null)
            .map((a) => (
              <span
                key={a.bssid}
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{ left: `${(a.x ?? 0) * 100}%`, top: `${(a.y ?? 0) * 100}%` }}
              >
                <span className="flex flex-col items-center gap-0.5">
                  <span className="flex h-6 w-6 items-center justify-center rounded-md border border-primary/60 bg-background/85 text-primary shadow">
                    <Radio className="h-3.5 w-3.5" />
                  </span>
                  <span className="mono-num rounded bg-background/80 px-1 text-[9px] text-foreground/80">{a.ssid}</span>
                </span>
              </span>
            ))}

          {/* current position */}
          {position ? (
            <span
              className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
              style={{ left: `${position.x * 100}%`, top: `${position.y * 100}%` }}
            >
              <span className="relative flex h-4 w-4 items-center justify-center">
                <span className="absolute h-4 w-4 rounded-full bg-primary/60 position-pulse" />
                <MapPin className="relative h-4 w-4 text-primary drop-shadow" />
              </span>
            </span>
          ) : null}
        </div>

        {/* overlays */}
        {mode === "demo" ? (
          <div className="pointer-events-none absolute top-2 left-2 rounded-md border border-[var(--demo)]/40 bg-[var(--demo)]/12 px-2 py-1 text-[10px] font-semibold tracking-wider text-[var(--demo)] uppercase">
            Demo mode — simulated data
          </div>
        ) : null}
        {!floorPlan.src ? (
          <div className="pointer-events-none absolute right-3 bottom-3 rounded-md border border-border bg-panel/80 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            No floor plan loaded — using reference grid
          </div>
        ) : null}
        {floorPlan.widthMeters ? (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-md border border-border bg-panel/80 px-2.5 py-1.5">
            <div className="mono-num text-[11px] text-foreground">
              Scale ≈ {floorPlan.widthMeters.toFixed(1)} m across plan
            </div>
          </div>
        ) : null}
        {tool === "calibrate" || tool === "wall" ? (
          <div className="pointer-events-none absolute top-2 right-2 rounded-md border border-border bg-panel/85 px-2.5 py-1.5 text-[11px] text-muted-foreground">
            {pending ? "Click the second point" : `Click the first point of the ${tool === "wall" ? "wall" : "known distance"}`}
          </div>
        ) : null}
      </div>
    </div>
  );
}
