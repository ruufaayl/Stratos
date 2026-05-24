"use client";
import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { sparklineDraw } from "@/lib/design/motion";
import { semanticColor, type SemanticKind } from "@/lib/design/tokens";

type SparklineProps = {
  data: number[];
  kind?: SemanticKind;
  width?: number;
  height?: number;
  className?: string;
  /** Plain-language label for screen readers. */
  srLabel?: string;
};

export function Sparkline({
  data,
  kind = "savings",
  width = 280,
  height = 50,
  className,
  srLabel,
}: SparklineProps) {
  const reduce = useReducedMotion();
  const stroke = semanticColor[kind];
  const points = pointsFor(data, width, height);
  const path = `M ${points.map((p) => `${p.x},${p.y}`).join(" L ")}`;
  const last = points[points.length - 1];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      height={height}
      className={className}
      role={srLabel ? "img" : undefined}
      aria-label={srLabel}
    >
      <motion.path
        d={path}
        fill="none"
        stroke={stroke}
        strokeWidth={1.5}
        initial={reduce ? false : { pathLength: 0, opacity: 0 }}
        animate={reduce ? undefined : { pathLength: 1, opacity: 1 }}
        transition={sparklineDraw}
      />
      {last ? <circle cx={last.x} cy={last.y} r={3} fill={stroke} /> : null}
    </svg>
  );
}

function pointsFor(data: number[], w: number, h: number) {
  if (data.length === 0) return [];
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pad = 4;
  return data.map((v, i) => ({
    x: (i / Math.max(1, data.length - 1)) * w,
    y: h - pad - ((v - min) / span) * (h - pad * 2),
  }));
}
