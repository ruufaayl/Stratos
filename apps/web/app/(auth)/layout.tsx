import * as React from "react";
import Link from "next/link";
import { AuthFooter } from "@/components/auth/auth-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-dvh flex flex-col items-center justify-center bg-bg-canvas px-4 py-12">
      {/* Pulsing-dot logo + Stratos wordmark */}
      <Link href="/" className="mb-8 flex items-center gap-2 text-text-primary">
        <div className="size-2 rounded-full bg-savings-500 animate-pulse-dot" />
        <span className="font-semibold tracking-tight">Stratos</span>
      </Link>

      {/* Form area — centered, fills remaining space */}
      <div className="flex-1 flex items-center w-full justify-center">
        {children}
      </div>

      {/* Legal footer — constrained to card width */}
      <div className="mt-8 max-w-[420px] w-full">
        <AuthFooter />
      </div>
    </main>
  );
}
