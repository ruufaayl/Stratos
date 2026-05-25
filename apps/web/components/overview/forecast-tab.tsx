"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";
import { Empty } from "@/components/ui/empty";
import { usd } from "@/lib/utils";

interface ScanPoint {
  label: string;
  waste: number;
  findings: number;
  date: string;
}

interface ForecastTabProps {
  scanHistory: ScanPoint[];
}

/**
 * Forecast tab — scan history trend chart.
 * Shows monthly waste across the last 10 succeeded runs.
 * Falls back to Empty states for 0 or 1 scan.
 */
export function ForecastTab({ scanHistory }: ForecastTabProps) {
  if (scanHistory.length === 0) {
    return (
      <Empty
        title="No scan history yet"
        body="Run your first scan to see waste trends over time. Chart populates after 2+ scans."
      />
    );
  }

  if (scanHistory.length === 1) {
    return (
      <Empty
        title="One scan completed"
        body={`Waste detected: ${usd(scanHistory[0]!.waste)}/mo across ${scanHistory[0]!.findings} finding${scanHistory[0]!.findings !== 1 ? "s" : ""}. Run another scan to see trends.`}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-text-muted text-xs font-mono uppercase tracking-widest">
        Monthly waste · scan history
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={scanHistory} margin={{ top: 4, right: 16, bottom: 4, left: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: "var(--color-text-faint)" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              formatter={(v) => usd(Number(v ?? 0))}
              contentStyle={{
                background: "var(--color-bg-elevated)",
                border: "1px solid var(--color-border-subtle)",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="waste"
              stroke="#EF4444"
              strokeWidth={2}
              dot={{ fill: "#EF4444", r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-text-faint text-center">
        {scanHistory.length} scan{scanHistory.length !== 1 ? "s" : ""} · latest:{" "}
        {usd(scanHistory[scanHistory.length - 1]!.waste)}/mo waste
      </p>
    </div>
  );
}
