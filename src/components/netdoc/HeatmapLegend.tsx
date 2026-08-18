import { LAYERS, layerScale, rampColor, rssiCategory } from "@/lib/survey/heatmap";
import type { HeatmapLayer, RssiThresholds } from "@/lib/survey/types";

function gradientCss() {
  const stops = Array.from({ length: 11 }, (_, i) => {
    const [r, g, b] = rampColor(i / 10);
    return `rgb(${r},${g},${b}) ${i * 10}%`;
  });
  return `linear-gradient(90deg, ${stops.join(",")})`;
}

export function HeatmapLegend({ layer, thresholds }: { layer: HeatmapLayer; thresholds: RssiThresholds }) {
  const meta = LAYERS.find((l) => l.id === layer)!;
  const scale = layerScale(layer);

  if (layer === "channel") {
    return (
      <div className="panel-surface p-3">
        <div className="label-caps mb-2">Legend — Channel</div>
        <p className="text-xs text-muted-foreground">
          Each colour represents the channel of the strongest measured AP at that location.
        </p>
      </div>
    );
  }

  const isRssi = layer === "rssi" || layer === "ap_coverage";

  return (
    <div className="panel-surface p-3">
      <div className="label-caps mb-2">Legend — {meta.label}</div>
      <div className="h-2.5 w-full rounded-full" style={{ background: gradientCss() }} />
      <div className="mono-num mt-1 flex justify-between text-[10px] text-muted-foreground">
        <span>
          {scale.higherIsBetter ? scale.min : scale.max} {meta.unit}
        </span>
        <span>
          {scale.higherIsBetter ? scale.max : scale.min} {meta.unit}
        </span>
      </div>
      {isRssi ? (
        <div className="mt-3 space-y-1.5">
          {(
            [
              [`≥ ${thresholds.excellent} dBm`, thresholds.excellent],
              [`${thresholds.good} … ${thresholds.excellent} dBm`, thresholds.good],
              [`${thresholds.fair} … ${thresholds.good} dBm`, thresholds.fair],
              [`${thresholds.weak} … ${thresholds.fair} dBm`, thresholds.weak],
              [`< ${thresholds.weak} dBm`, thresholds.weak - 1],
            ] as [string, number][]
          ).map(([range, v]) => {
            const cat = rssiCategory(v, thresholds);
            return (
              <div key={range} className="flex items-center gap-2 text-xs">
                <span className="h-2.5 w-2.5 rounded-sm" style={{ background: cat.color }} />
                <span className="text-foreground">{cat.label}</span>
                <span className="mono-num ml-auto text-muted-foreground">{range}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
