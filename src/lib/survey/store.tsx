import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { DEFAULT_AGENT_URL, agentApi, openAgentSocket, parseNetworks, parseWifiSample } from "./agent";
import { demoAccessPoints, demoNetworks, demoSampleAt, demoWalkPoint } from "./demo";
import { DEFAULT_THRESHOLDS } from "./heatmap";
import { localProjectRepository } from "./projects";
import type {
  AccessPoint,
  DataMode,
  FloorPlan,
  HeatmapLayer,
  MeasurementPoint,
  NetworkEntry,
  Obstacle,
  PositionSource,
  RssiThresholds,
  ScannerStatus,
  SurveyProject,
  SurveyState,
  WifiSample,
} from "./types";

const EMPTY_PLAN: FloorPlan = {
  name: "Untitled floor plan",
  src: null,
  calibrationMeters: null,
  calibrationNormalizedLength: null,
  widthMeters: null,
};

const uid = () => Math.random().toString(36).slice(2, 10);

interface SurveyContextValue {
  // identity
  projectId: string;
  projectName: string;
  setProjectName: (n: string) => void;

  // mode & scanner
  mode: DataMode;
  scannerStatus: ScannerStatus;
  scannerMessage: string;
  agentUrl: string;
  setAgentUrl: (u: string) => void;
  connect: () => void;
  disconnect: () => void;
  testConnection: () => Promise<void>;
  enterDemoMode: () => void;
  exitDemoMode: () => void;

  // live data
  current: WifiSample | null;
  samples: WifiSample[];
  networks: NetworkEntry[];
  refreshNetworks: () => Promise<void>;
  accessPoints: AccessPoint[];
  placeAccessPoint: (bssid: string, x: number, y: number) => void;
  targetSsid: string | null;
  targetBssid: string | null;
  selectTarget: (ssid: string | null, bssid: string | null) => void;
  focusedApBssid: string | null;
  setFocusedApBssid: (b: string | null) => void;

  // survey
  surveyState: SurveyState;
  startSurvey: () => void;
  pauseSurvey: () => void;
  stopSurvey: () => void;
  clearMeasurements: () => void;
  points: MeasurementPoint[];
  elapsedMs: number;

  // position
  position: { x: number; y: number } | null;
  positionSource: PositionSource;
  setManualPosition: (x: number, y: number) => void;

  // floor plan
  floorPlan: FloorPlan;
  setFloorPlanImage: (name: string, src: string) => void;
  setCalibration: (meters: number, normalizedLength: number) => void;
  obstacles: Obstacle[];
  addObstacle: (o: Omit<Obstacle, "id">) => void;
  removeObstacle: (id: string) => void;

  // visualization
  layer: HeatmapLayer;
  setLayer: (l: HeatmapLayer) => void;
  thresholds: RssiThresholds;
  setThresholds: (t: RssiThresholds) => void;
  heatmapOpacity: number;
  setHeatmapOpacity: (v: number) => void;
  chartsPaused: boolean;
  setChartsPaused: (v: boolean) => void;

  // demo walk
  demoWalking: boolean;
  toggleDemoWalk: () => void;

  // projects
  projects: SurveyProject[];
  refreshProjects: () => Promise<void>;
  newProject: (name?: string) => void;
  saveProject: () => Promise<void>;
  openProject: (id: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  snapshot: () => SurveyProject;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [projectId, setProjectId] = useState(() => uid());
  const [projectName, setProjectName] = useState("Untitled Survey");

  const [mode, setMode] = useState<DataMode>("idle");
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>("offline");
  const [scannerMessage, setScannerMessage] = useState("Scanner Offline");
  const [agentUrl, setAgentUrl] = useState(DEFAULT_AGENT_URL);

  const [current, setCurrent] = useState<WifiSample | null>(null);
  const [samples, setSamples] = useState<WifiSample[]>([]);
  const [networks, setNetworks] = useState<NetworkEntry[]>([]);
  const [accessPoints, setAccessPoints] = useState<AccessPoint[]>([]);
  const [targetSsid, setTargetSsid] = useState<string | null>(null);
  const [targetBssid, setTargetBssid] = useState<string | null>(null);
  const [focusedApBssid, setFocusedApBssid] = useState<string | null>(null);

  const [surveyState, setSurveyState] = useState<SurveyState>("stopped");
  const [points, setPoints] = useState<MeasurementPoint[]>([]);
  const [elapsedMs, setElapsedMs] = useState(0);

  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const [positionSource, setPositionSource] = useState<PositionSource>("none");

  const [floorPlan, setFloorPlan] = useState<FloorPlan>(EMPTY_PLAN);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);

  const [layer, setLayer] = useState<HeatmapLayer>("rssi");
  const [thresholds, setThresholds] = useState<RssiThresholds>(DEFAULT_THRESHOLDS);
  const [heatmapOpacity, setHeatmapOpacity] = useState(0.72);
  const [chartsPaused, setChartsPaused] = useState(false);

  const [demoWalking, setDemoWalking] = useState(false);
  const [projects, setProjects] = useState<SurveyProject[]>([]);

  const socketRef = useRef<{ close: () => void } | null>(null);
  const surveyStateRef = useRef(surveyState);
  const positionRef = useRef(position);
  const sourceRef = useRef(positionSource);
  const startedAtRef = useRef<number | null>(null);
  const accumRef = useRef(0);
  const demoStepRef = useRef(0);
  const modeRef = useRef(mode);

  surveyStateRef.current = surveyState;
  positionRef.current = position;
  sourceRef.current = positionSource;
  modeRef.current = mode;

  const ingest = useCallback((sample: WifiSample) => {
    setCurrent(sample);
    setSamples((prev) => [...prev.slice(-399), sample]);

    if (sample.bssid) {
      setAccessPoints((prev) => {
        const now = sample.timestamp;
        const idx = prev.findIndex((a) => a.bssid === sample.bssid);
        const historyEntry = { t: Date.parse(now) || Date.now(), rssi: sample.rssi ?? -100 };
        if (idx === -1) {
          return [
            ...prev,
            {
              bssid: sample.bssid!,
              ssid: sample.ssid ?? "(hidden)",
              channel: sample.channel ?? 0,
              band: sample.band ?? "—",
              frequency: sample.frequency ?? 0,
              rssi: sample.rssi ?? -100,
              history: [historyEntry],
              firstSeen: now,
              lastSeen: now,
              simulated: sample.simulated,
            },
          ];
        }
        const next = [...prev];
        const ap = next[idx]!;
        next[idx] = {
          ...ap,
          rssi: sample.rssi ?? ap.rssi,
          channel: sample.channel ?? ap.channel,
          band: sample.band ?? ap.band,
          lastSeen: now,
          history: [...ap.history.slice(-199), historyEntry],
        };
        return next;
      });
    }

    if (surveyStateRef.current === "running" && positionRef.current) {
      const pos = positionRef.current;
      setPoints((prev) => [
        ...prev,
        { ...sample, id: uid(), x: pos.x, y: pos.y, source: sourceRef.current },
      ]);
    }
  }, []);

  /* ---------------- live agent ---------------- */

  const disconnect = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setScannerStatus("offline");
    setScannerMessage("Scanner Offline");
    setCurrent(null);
  }, []);

  const connect = useCallback(() => {
    if (typeof window === "undefined") return;
    socketRef.current?.close();
    setDemoWalking(false);
    setMode("live");
    setScannerStatus("connecting");
    setScannerMessage("Connecting to local Wi-Fi agent…");
    socketRef.current = openAgentSocket(agentUrl, {
      onOpen: () => {
        setScannerStatus("online");
        setScannerMessage("Scanner connected");
        toast.success("Local Wi-Fi agent connected");
      },
      onSample: (s) => ingest(s),
      onNetworks: (n) => setNetworks(n),
      onClose: (reason) => {
        socketRef.current = null;
        setScannerStatus("offline");
        setScannerMessage(reason ? `Scanner Offline — ${reason}` : "Scanner Offline");
        setCurrent(null);
      },
    });
  }, [agentUrl, ingest]);

  const testConnection = useCallback(async () => {
    try {
      const health = await agentApi.health(agentUrl);
      toast.success(`Agent healthy${health?.version ? ` — v${health.version}` : ""}`);
    } catch (e) {
      toast.error(`Agent unreachable at ${agentUrl}`, {
        description: e instanceof Error ? e.message : "No response",
      });
    }
  }, [agentUrl]);

  const refreshNetworks = useCallback(async () => {
    if (modeRef.current === "demo") {
      setNetworks(demoNetworks(positionRef.current?.x ?? 0.5, positionRef.current?.y ?? 0.5));
      return;
    }
    try {
      await agentApi.scan(agentUrl).catch(() => undefined);
      const raw = await agentApi.networks(agentUrl);
      const list = parseNetworks(raw);
      setNetworks(list);
      if (!list.length) toast.message("Agent returned no networks");
    } catch (e) {
      setNetworks([]);
      toast.error("Scanner Offline — cannot list networks", {
        description: e instanceof Error ? e.message : undefined,
      });
    }
  }, [agentUrl]);

  /* poll /wifi/current as a fallback when the socket is silent */
  useEffect(() => {
    if (mode !== "live" || scannerStatus !== "online") return;
    const id = window.setInterval(async () => {
      try {
        const raw = await agentApi.current(agentUrl);
        const s = parseWifiSample(raw);
        if (s) ingest(s);
      } catch {
        /* socket remains the primary source */
      }
    }, 3000);
    return () => window.clearInterval(id);
  }, [mode, scannerStatus, agentUrl, ingest]);

  /* ---------------- demo mode ---------------- */

  const enterDemoMode = useCallback(() => {
    socketRef.current?.close();
    socketRef.current = null;
    setMode("demo");
    setScannerStatus("online");
    setScannerMessage("Demo scanner (simulated)");
    setAccessPoints((prev) => (prev.some((a) => a.simulated) ? prev : [...demoAccessPoints(), ...prev]));
    setNetworks(demoNetworks());
    setTargetSsid("NetDoc-Corp");
    if (!positionRef.current) {
      setPosition({ x: 0.1, y: 0.12 });
      setPositionSource("demo");
    }
  }, []);

  const exitDemoMode = useCallback(() => {
    setDemoWalking(false);
    setMode("idle");
    setScannerStatus("offline");
    setScannerMessage("Scanner Offline");
    setCurrent(null);
  }, []);

  useEffect(() => {
    if (mode !== "demo") return;
    const id = window.setInterval(() => {
      let pos = positionRef.current ?? { x: 0.5, y: 0.5 };
      if (demoWalking) {
        demoStepRef.current += 1;
        pos = demoWalkPoint(demoStepRef.current);
        setPosition(pos);
        setPositionSource("demo");
      }
      ingest(demoSampleAt(pos.x, pos.y));
    }, 650);
    return () => window.clearInterval(id);
  }, [mode, demoWalking, ingest]);

  const toggleDemoWalk = useCallback(() => {
    if (modeRef.current !== "demo") enterDemoMode();
    setDemoWalking((w) => !w);
  }, [enterDemoMode]);

  /* ---------------- survey timer ---------------- */

  useEffect(() => {
    if (surveyState !== "running") return;
    const id = window.setInterval(() => {
      setElapsedMs(accumRef.current + (startedAtRef.current ? Date.now() - startedAtRef.current : 0));
    }, 500);
    return () => window.clearInterval(id);
  }, [surveyState]);

  const startSurvey = useCallback(() => {
    if (modeRef.current === "idle") {
      toast.error("No data source", { description: "Connect the local agent or enter Demo Mode first." });
      return;
    }
    startedAtRef.current = Date.now();
    setSurveyState("running");
  }, []);

  const pauseSurvey = useCallback(() => {
    accumRef.current += startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    startedAtRef.current = null;
    setSurveyState("paused");
  }, []);

  const stopSurvey = useCallback(() => {
    accumRef.current += startedAtRef.current ? Date.now() - startedAtRef.current : 0;
    startedAtRef.current = null;
    setDemoWalking(false);
    setSurveyState("stopped");
  }, []);

  const clearMeasurements = useCallback(() => {
    setPoints([]);
    setSamples([]);
    accumRef.current = 0;
    startedAtRef.current = surveyStateRef.current === "running" ? Date.now() : null;
    setElapsedMs(0);
  }, []);

  /* ---------------- floor plan ---------------- */

  const setFloorPlanImage = useCallback((name: string, src: string) => {
    setFloorPlan((p) => ({ ...p, name, src }));
  }, []);

  const setCalibration = useCallback((meters: number, normalizedLength: number) => {
    setFloorPlan((p) => ({
      ...p,
      calibrationMeters: meters,
      calibrationNormalizedLength: normalizedLength,
      widthMeters: normalizedLength > 0 ? meters / normalizedLength : null,
    }));
  }, []);

  const addObstacle = useCallback((o: Omit<Obstacle, "id">) => {
    setObstacles((prev) => [...prev, { ...o, id: uid() }]);
  }, []);
  const removeObstacle = useCallback((id: string) => {
    setObstacles((prev) => prev.filter((o) => o.id !== id));
  }, []);

  const setManualPosition = useCallback((x: number, y: number) => {
    setPosition({ x, y });
    setPositionSource("manual");
  }, []);

  const placeAccessPoint = useCallback((bssid: string, x: number, y: number) => {
    setAccessPoints((prev) => prev.map((a) => (a.bssid === bssid ? { ...a, x, y } : a)));
  }, []);

  const selectTarget = useCallback((ssid: string | null, bssid: string | null) => {
    setTargetSsid(ssid);
    setTargetBssid(bssid);
  }, []);

  /* ---------------- projects ---------------- */

  const snapshot = useCallback(
    (): SurveyProject => ({
      id: projectId,
      name: projectName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      mode,
      floorPlan,
      obstacles,
      points,
      accessPoints,
      targetSsid,
      targetBssid,
      thresholds,
      layer,
    }),
    [projectId, projectName, mode, floorPlan, obstacles, points, accessPoints, targetSsid, targetBssid, thresholds, layer],
  );

  const refreshProjects = useCallback(async () => {
    setProjects(await localProjectRepository.list());
  }, []);

  useEffect(() => {
    void refreshProjects();
  }, [refreshProjects]);

  const newProject = useCallback((name = "Untitled Survey") => {
    setProjectId(uid());
    setProjectName(name);
    setPoints([]);
    setSamples([]);
    setObstacles([]);
    setAccessPoints([]);
    setFloorPlan(EMPTY_PLAN);
    setPosition(null);
    setPositionSource("none");
    setSurveyState("stopped");
    accumRef.current = 0;
    startedAtRef.current = null;
    setElapsedMs(0);
  }, []);

  const saveProject = useCallback(async () => {
    await localProjectRepository.save(snapshot());
    await refreshProjects();
    toast.success("Project saved");
  }, [snapshot, refreshProjects]);

  const openProject = useCallback(
    async (id: string) => {
      const list = await localProjectRepository.list();
      const p = list.find((x) => x.id === id);
      if (!p) {
        toast.error("Project not found");
        return;
      }
      setProjectId(p.id);
      setProjectName(p.name);
      setFloorPlan(p.floorPlan ?? EMPTY_PLAN);
      setObstacles(p.obstacles ?? []);
      setPoints(p.points ?? []);
      setAccessPoints(p.accessPoints ?? []);
      setTargetSsid(p.targetSsid ?? null);
      setTargetBssid(p.targetBssid ?? null);
      setThresholds(p.thresholds ?? DEFAULT_THRESHOLDS);
      setLayer(p.layer ?? "rssi");
      toast.success(`Opened “${p.name}”`);
    },
    [],
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await localProjectRepository.remove(id);
      await refreshProjects();
      toast.success("Project deleted");
    },
    [refreshProjects],
  );

  useEffect(() => () => socketRef.current?.close(), []);

  const value = useMemo<SurveyContextValue>(
    () => ({
      projectId,
      projectName,
      setProjectName,
      mode,
      scannerStatus,
      scannerMessage,
      agentUrl,
      setAgentUrl,
      connect,
      disconnect,
      testConnection,
      enterDemoMode,
      exitDemoMode,
      current,
      samples,
      networks,
      refreshNetworks,
      accessPoints,
      placeAccessPoint,
      targetSsid,
      targetBssid,
      selectTarget,
      focusedApBssid,
      setFocusedApBssid,
      surveyState,
      startSurvey,
      pauseSurvey,
      stopSurvey,
      clearMeasurements,
      points,
      elapsedMs,
      position,
      positionSource,
      setManualPosition,
      floorPlan,
      setFloorPlanImage,
      setCalibration,
      obstacles,
      addObstacle,
      removeObstacle,
      layer,
      setLayer,
      thresholds,
      setThresholds,
      heatmapOpacity,
      setHeatmapOpacity,
      chartsPaused,
      setChartsPaused,
      demoWalking,
      toggleDemoWalk,
      projects,
      refreshProjects,
      newProject,
      saveProject,
      openProject,
      deleteProject,
      snapshot,
    }),
    [
      projectId, projectName, mode, scannerStatus, scannerMessage, agentUrl, connect, disconnect,
      testConnection, enterDemoMode, exitDemoMode, current, samples, networks, refreshNetworks,
      accessPoints, placeAccessPoint, targetSsid, targetBssid, selectTarget, focusedApBssid,
      surveyState, startSurvey, pauseSurvey, stopSurvey, clearMeasurements, points, elapsedMs,
      position, positionSource, setManualPosition, floorPlan, setFloorPlanImage, setCalibration,
      obstacles, addObstacle, removeObstacle, layer, thresholds, heatmapOpacity, chartsPaused,
      demoWalking, toggleDemoWalk, projects, refreshProjects, newProject, saveProject, openProject,
      deleteProject, snapshot,
    ],
  );

  return <SurveyContext.Provider value={value}>{children}</SurveyContext.Provider>;
}

export function useSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error("useSurvey must be used inside <SurveyProvider>");
  return ctx;
}
