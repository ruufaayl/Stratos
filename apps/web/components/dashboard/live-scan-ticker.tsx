"use client";

/**
 * LiveScanTicker — mounts on the /proof page and connects to the engine's
 * SSE stream at /engine/proof/stream. It animates the waste counter ticking
 * up as each VM is analysed, so a visitor sees the engine actually working,
 * not just a static number.
 *
 * The proof page still SSR-renders the full analysis (from /proof/synthetic)
 * so there is no loading state for content — this ticker is purely additive
 * theater on top of real deterministic math.
 */

import { useEffect, useRef, useState } from "react";

import { usd } from "@/lib/utils";

type Phase = "connecting" | "scanning" | "done" | "error";

export function LiveScanTicker() {
  const [phase, setPhase] = useState<Phase>("connecting");
  const [running, setRunning] = useState(0);
  const [found, setFound] = useState(0);
  const [total, setTotal] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startRef.current = Date.now();

    // tick the elapsed-time display while scanning
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000));
    }, 1000);

    const es = new EventSource("/engine/proof/stream");

    es.addEventListener("start", () => {
      setPhase("scanning");
    });

    es.addEventListener("opportunity", (e: MessageEvent) => {
      const d = JSON.parse(e.data) as {
        running_total: number;
        opportunity?: { kind: string };
      };
      setRunning(d.running_total);
      setFound((c) => c + 1);
    });

    es.addEventListener("done", (e: MessageEvent) => {
      const d = JSON.parse(e.data) as { total_monthly_waste: number };
      setRunning(d.total_monthly_waste);
      setTotal(d.total_monthly_waste);
      setPhase("done");
      es.close();
      if (timerRef.current) clearInterval(timerRef.current);
    });

    es.onerror = () => {
      setPhase("error");
      es.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };

    return () => {
      es.close();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="flex items-center gap-3 text-data-sm font-mono">
      {phase === "connecting" && (
        <>
          <span className="size-2 rounded-full bg-warn animate-pulse-dot" />
          <span className="text-fg-subtle">connecting to engine…</span>
        </>
      )}

      {phase === "scanning" && (
        <>
          <span className="size-2 rounded-full bg-brand animate-pulse-dot" />
          <span className="text-fg-subtle">
            scanning fleet — found{" "}
            <span className="text-bad tabular">{usd(running)}</span>
            {found > 0 && (
              <span className="text-fg-subtle ml-1">
                ({found} {found === 1 ? "opportunity" : "opportunities"})
              </span>
            )}
          </span>
          <span className="text-fg-subtle opacity-50">{elapsed}s</span>
        </>
      )}

      {phase === "done" && (
        <>
          <span className="size-2 rounded-full bg-good" />
          <span className="text-fg-subtle">
            scan complete ·{" "}
            <span className="text-bad tabular">{usd(total)}</span>
            {" identified in "}
            <span className="text-fg tabular">{elapsed}s</span>
          </span>
        </>
      )}

      {phase === "error" && (
        <>
          <span className="size-2 rounded-full bg-bad" />
          <span className="text-fg-subtle">stream unavailable (engine offline?)</span>
        </>
      )}
    </div>
  );
}
