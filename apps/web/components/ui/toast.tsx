"use client";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toastEnter } from "@/lib/design/motion";
import { cn } from "@/lib/utils";

type ToastKind = "intelligence" | "savings" | "waste" | "risk" | "neutral";

type ToastInput  = { kind?: ToastKind; title: string; body?: string; durationMs?: number };
type ToastRecord = { id: number; kind: ToastKind; title: string; body?: string; durationMs: number };

type ToastCtx = { push: (t: ToastInput) => void };
const Ctx = React.createContext<ToastCtx | null>(null);

export function useToast() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [list, setList] = React.useState<ToastRecord[]>([]);
  const nextId = React.useRef(1);

  const push = React.useCallback((t: ToastInput) => {
    const id = nextId.current++;
    const record: ToastRecord = {
      id,
      kind: t.kind ?? "neutral",
      title: t.title,
      body: t.body,
      durationMs: t.durationMs ?? 5000,
    };
    setList((cur) => [...cur, record]);
    setTimeout(() => setList((cur) => cur.filter((x) => x.id !== id)), record.durationMs);
  }, []);

  return (
    <Ctx.Provider value={{ push }}>
      {children}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="false"
        className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none"
      >
        {list.map((t) => (
          <motion.div
            key={t.id}
            variants={toastEnter}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={cn(
              "pointer-events-auto min-w-[280px] max-w-[360px] px-4 py-3 rounded-card border bg-bg-elevated shadow-[0_24px_64px_rgba(0,0,0,0.5)]",
              borderForKind(t.kind),
            )}
          >
            <div className="text-[13px] font-medium text-text-primary">{t.title}</div>
            {t.body ? <div className="text-mono-sm text-text-muted mt-0.5">{t.body}</div> : null}
          </motion.div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

function borderForKind(k: ToastKind) {
  switch (k) {
    case "intelligence": return "border-intel-500";
    case "savings":      return "border-savings-500";
    case "waste":        return "border-waste-500";
    case "risk":         return "border-risk-500";
    default:             return "border-border-strong";
  }
}
