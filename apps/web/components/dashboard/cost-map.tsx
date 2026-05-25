"use client";

import { useRouter } from "next/navigation";
import { hierarchy, treemap, treemapSquarify } from "d3-hierarchy";
import { scaleLinear } from "d3-scale";

import { usd } from "@/lib/utils";

interface CostMapNode {
  id: string;
  monthly_cost: number;
  /** 0..1 — 0 = perfectly efficient, 1 = entirely wasted. */
  waste_intensity: number;
  /** Optional navigation target — when set, clicking the cell navigates here. */
  href?: string;
}

interface CostMapProps {
  nodes: CostMapNode[];
  width?: number;
  height?: number;
}

/**
 * Squarified treemap of fleet cost. Rectangle area is proportional to monthly
 * spend; color goes emerald → amber → red with waste intensity. ENGINE.md §8.
 */
export function CostMap({ nodes, width = 480, height = 360 }: CostMapProps) {
  const router = useRouter();

  if (nodes.length === 0) {
    return (
      <div className="h-[360px] flex items-center justify-center text-text-muted text-sm">
        No cost data yet.
      </div>
    );
  }

  // d3-hierarchy expects a tree. We give it one synthetic root with the nodes
  // as leaves — a flat treemap.
  const root = hierarchy<{ children?: CostMapNode[]; value?: number; id: string }>(
    { id: "fleet", children: nodes } as any,
  )
    .sum((d) => ("monthly_cost" in d ? (d as unknown as CostMapNode).monthly_cost : 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  treemap<{ id: string }>()
    .size([width, height])
    .padding(1)
    .tile(treemapSquarify)(root as any);

  // Continuous color scale matching the design tokens.
  const color = scaleLinear<string>()
    .domain([0, 0.5, 1])
    .range(["#10B981", "#F59E0B", "#EF4444"])
    .clamp(true);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="w-full h-auto"
      preserveAspectRatio="xMidYMid meet"
    >
      {(root.leaves() as any[]).map((leaf) => {
        const d = leaf.data as CostMapNode;
        const w = leaf.x1 - leaf.x0;
        const h = leaf.y1 - leaf.y0;
        const fill = color(d.waste_intensity);
        // Only label rectangles big enough to read.
        const labelable = w > 64 && h > 28;
        return (
          <g
            key={d.id}
            transform={`translate(${leaf.x0},${leaf.y0})`}
            onClick={() => d.href && router.push(d.href)}
            style={{ cursor: d.href ? "pointer" : undefined }}
          >
            <rect
              width={w}
              height={h}
              fill={fill}
              fillOpacity={0.85}
              stroke="#0A0A0F"
              strokeWidth={0.5}
            >
              <title>
                {d.id} — {usd(d.monthly_cost)}/mo · waste {Math.round(d.waste_intensity * 100)}%
              </title>
            </rect>
            {labelable && (
              <>
                <text
                  x={6}
                  y={14}
                  fill="#0A0A0F"
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight={600}
                >
                  {d.id.slice(0, 16)}
                </text>
                <text
                  x={6}
                  y={28}
                  fill="#0A0A0F"
                  fontSize={10}
                  fontFamily="JetBrains Mono, monospace"
                  opacity={0.7}
                >
                  {usd(d.monthly_cost, { compact: true })}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}
