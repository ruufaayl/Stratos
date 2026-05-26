"use client";

import { useState } from "react";
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

interface TooltipState {
  node: CostMapNode;
  x: number;
  y: number;
}

/** Truncate a resource ID to 24 visible characters. */
function truncateId(id: string): string {
  return id.length > 24 ? id.slice(0, 24) + "…" : id;
}

/**
 * Squarified treemap of fleet cost. Rectangle area is proportional to monthly
 * spend; color goes emerald → amber → red with waste intensity. ENGINE.md §8.
 */
export function CostMap({ nodes, width = 480, height = 360 }: CostMapProps) {
  const router = useRouter();
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

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
    <div className="relative inline-block w-full">
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setTooltip(null)}
      >
        {(root.leaves() as any[]).map((leaf) => {
          const d = leaf.data as CostMapNode;
          const w = leaf.x1 - leaf.x0;
          const h = leaf.y1 - leaf.y0;
          const fill = color(d.waste_intensity);
          // Only label rectangles big enough to read.
          const labelable = w > 64 && h > 28;
          const riskLabel = `Risk: ${d.waste_intensity.toFixed(2)}`;
          const ariaLabel = `Resource ${d.id}, ${usd(d.monthly_cost)} per month, ${riskLabel}`;

          return (
            <g
              key={d.id}
              transform={`translate(${leaf.x0},${leaf.y0})`}
              onClick={() => d.href && router.push(d.href)}
              style={{ cursor: d.href ? "pointer" : undefined }}
              role="img"
              aria-label={ariaLabel}
              onMouseMove={(e) => {
                // Get the bounding rect of the SVG container to convert mouse
                // coords to container-relative position for tooltip placement.
                const svgEl = e.currentTarget.closest("svg");
                if (!svgEl) return;
                const rect = svgEl.getBoundingClientRect();
                setTooltip({
                  node: d,
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            >
              <title>
                {d.id} — {usd(d.monthly_cost)}/mo · waste {Math.round(d.waste_intensity * 100)}%
              </title>
              <rect
                width={w}
                height={h}
                fill={fill}
                fillOpacity={0.85}
                stroke="#0A0A0F"
                strokeWidth={0.5}
              />
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

      {/* Floating tooltip — decorative, pointer-events disabled */}
      {tooltip && (
        <div
          aria-hidden="true"
          className="absolute z-50 pointer-events-none px-3 py-2 rounded border border-border-strong bg-bg-elevated shadow-lg text-xs transition-opacity duration-100"
          style={{
            // Offset 12px right and up so the cursor doesn't overlap the content.
            left: tooltip.x + 12,
            top: tooltip.y - 8,
            // Prevent the tooltip from going off the right/bottom edge by clamping
            // via max-width; actual clamp is handled by the parent overflow.
            maxWidth: 200,
            // Ensure the tooltip is visible even near the right edge.
            transform:
              tooltip.x > width * 0.65 ? "translateX(calc(-100% - 16px))" : undefined,
          }}
        >
          <div className="font-mono font-semibold text-text-primary leading-tight mb-1">
            {truncateId(tooltip.node.id)}
          </div>
          <div className="text-savings-500 font-medium">
            {usd(tooltip.node.monthly_cost)}/mo
          </div>
          <div className="text-text-muted mt-0.5">
            Risk: {tooltip.node.waste_intensity.toFixed(2)}
          </div>
          {tooltip.node.href && (
            <div className="text-text-faint mt-1 border-t border-border-subtle pt-1">
              Click to view →
            </div>
          )}
        </div>
      )}
    </div>
  );
}
