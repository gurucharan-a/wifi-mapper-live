import { Check, RefreshCw, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { rssiCategory } from "@/lib/survey/heatmap";
import { useSurvey } from "@/lib/survey/store";

function quality(rssi: number) {
  return Math.max(0, Math.min(100, Math.round(2 * (rssi + 100))));
}

export function NetworkTable() {
  const { networks, refreshNetworks, selectTarget, targetBssid, thresholds, mode, scannerStatus } = useSurvey();
  const [q, setQ] = useState("");
  const [band, setBand] = useState("all");
  const [minRssi, setMinRssi] = useState("all");
  const [busy, setBusy] = useState(false);

  const rows = useMemo(
    () =>
      networks
        .filter((n) => n.ssid.toLowerCase().includes(q.toLowerCase()) || n.bssid.toLowerCase().includes(q.toLowerCase()))
        .filter((n) => band === "all" || n.band === band)
        .filter((n) => minRssi === "all" || n.rssi >= Number(minRssi))
        .sort((a, b) => b.rssi - a.rssi),
    [networks, q, band, minRssi],
  );

  return (
    <div className="panel-surface overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-border/70 p-3">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter by SSID or BSSID" className="h-9 pl-8" />
        </div>
        <Select value={band} onValueChange={setBand}>
          <SelectTrigger className="h-9 w-[130px]">
            <SelectValue placeholder="Band" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All bands</SelectItem>
            <SelectItem value="2.4 GHz">2.4 GHz</SelectItem>
            <SelectItem value="5 GHz">5 GHz</SelectItem>
            <SelectItem value="6 GHz">6 GHz</SelectItem>
          </SelectContent>
        </Select>
        <Select value={minRssi} onValueChange={setMinRssi}>
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue placeholder="Signal" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any signal</SelectItem>
            <SelectItem value="-60">≥ -60 dBm</SelectItem>
            <SelectItem value="-70">≥ -70 dBm</SelectItem>
            <SelectItem value="-80">≥ -80 dBm</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant="outline"
          className="h-9 gap-2"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await refreshNetworks();
            setBusy(false);
          }}
        >
          <RefreshCw className={busy ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
          Scan
        </Button>
      </div>

      {rows.length === 0 ? (
        <div className="p-10 text-center text-sm text-muted-foreground">
          {scannerStatus === "online" || mode === "demo"
            ? "No networks match the current filters. Run a scan to refresh."
            : "Scanner Offline — connect the local Wi-Fi agent to list networks."}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>SSID</TableHead>
              <TableHead>BSSID</TableHead>
              <TableHead className="text-right">RSSI</TableHead>
              <TableHead className="text-right">Ch</TableHead>
              <TableHead className="text-right">Freq</TableHead>
              <TableHead>Band</TableHead>
              <TableHead>Security</TableHead>
              <TableHead className="w-[160px]">Signal quality</TableHead>
              <TableHead className="text-right">Target</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((n) => {
              const cat = rssiCategory(n.rssi, thresholds);
              const selected = targetBssid === n.bssid;
              return (
                <TableRow key={n.bssid} className={selected ? "bg-primary/5" : undefined}>
                  <TableCell className="font-medium">
                    {n.ssid}
                    {n.simulated ? (
                      <span className="ml-2 rounded-sm bg-[var(--demo)]/15 px-1 text-[9px] font-semibold tracking-wide text-[var(--demo)] uppercase">
                        sim
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="mono-num text-xs text-muted-foreground">{n.bssid}</TableCell>
                  <TableCell className="mono-num text-right" style={{ color: cat.color }}>
                    {n.rssi} dBm
                  </TableCell>
                  <TableCell className="mono-num text-right">{n.channel || "—"}</TableCell>
                  <TableCell className="mono-num text-right text-muted-foreground">{n.frequency || "—"}</TableCell>
                  <TableCell className="text-xs">{n.band}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{n.security}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full" style={{ width: `${quality(n.rssi)}%`, background: cat.color }} />
                      </div>
                      <span className="mono-num w-9 text-right text-[11px] text-muted-foreground">{quality(n.rssi)}%</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant={selected ? "secondary" : "ghost"}
                      className="h-7 gap-1 text-xs"
                      onClick={() => selectTarget(n.ssid, n.bssid)}
                    >
                      {selected ? <Check className="h-3.5 w-3.5" /> : null}
                      {selected ? "Selected" : "Select"}
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
