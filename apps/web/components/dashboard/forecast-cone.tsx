interface ForecastConeProps {
  history: number[];     // actuals
  forecast: number[];    // mean projection
  upper: number[];       // upper band
  lower: number[];       // lower band
  anomalyDays?: number[];
  width?: number;
  height?: number;
}

/**
 * Pure-SVG forecast cone (no chart library). History line plus a fanned-out
 * confidence band that widens with sqrt(t) (the band data is computed engine-side).
 */
export function ForecastCone({
  history,
  forecast,
  upper,
  lower,
  anomalyDays = [],
  width = 720,
  height = 220,
}: ForecastConeProps) {
  const all = [...history, ...upper];
  const min = Math.min(...all, ...lower, 0);
  const max = Math.max(...all);
  const range = max - min || 1;
  const total = history.length + forecast.length;
  const xStep = width / (total - 1);

  const yFor = (v: number) => height - ((v - min) / range) * height;

  const histPts = history
    .map((v, i) => `${i * xStep},${yFor(v)}`)
    .join(" ");

  const fcStart = history.length;
  const fcPts = forecast
    .map((v, i) => `${(fcStart + i) * xStep},${yFor(v)}`)
    .join(" ");

  // Band polygon: walk upper forward, lower back.
  const upperPts = upper.map((v, i) => `${(fcStart + i) * xStep},${yFor(v)}`);
  const lowerPts = lower
    .map((v, i) => `${(fcStart + i) * xStep},${yFor(v)}`)
    .reverse();
  const band = `M ${upperPts.join(" L ")} L ${lowerPts.join(" L ")} Z`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="cone" x1="0" x2="1">
          <stop offset="0%" stopColor="#6366F1" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#6366F1" stopOpacity="0.05" />
        </linearGradient>
      </defs>
      <path d={band} fill="url(#cone)" stroke="none" />
      <polyline
        points={histPts}
        fill="none"
        stroke="#E8E8F0"
        strokeWidth={1.5}
      />
      <polyline
        points={fcPts}
        fill="none"
        stroke="#6366F1"
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      {anomalyDays.map((day) => {
        const v = history[day];
        if (v === undefined) return null;
        return (
          <circle
            key={day}
            cx={day * xStep}
            cy={yFor(v)}
            r={5}
            fill="#EF4444"
            opacity={0.85}
            className="animate-pulse-dot"
          />
        );
      })}
      <line
        x1={fcStart * xStep}
        x2={fcStart * xStep}
        y1={0}
        y2={height}
        stroke="#2A2A38"
        strokeDasharray="2 4"
      />
    </svg>
  );
}
