"use client";

import { useState } from "react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  scansUsed?: number;
  scansLimit?: number;
}

export function UpgradeModal({
  open,
  onClose,
  scansUsed,
  scansLimit,
}: UpgradeModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-[#0A0A0F] border border-white/10 rounded-xl p-8 max-w-md w-full mx-4">
        {/* Icon */}
        <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-full border border-indigo-500/40 bg-indigo-500/10">
          <svg
            className="h-5 w-5 text-indigo-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>

        {/* Title */}
        <h2 className="text-[18px] font-semibold text-white leading-snug mb-2">
          You&apos;ve reached your scan limit
        </h2>

        {/* Body */}
        {scansUsed !== undefined && scansLimit !== undefined && (
          <p className="text-sm text-white/60 mb-1">
            You&apos;ve used{" "}
            <span className="text-white/90 font-medium">
              {scansUsed}/{scansLimit}
            </span>{" "}
            free scans this month.
          </p>
        )}

        {/* Sub-body */}
        <p className="text-sm text-white/50 mb-7">
          Upgrade to Pro for unlimited scans, CSV export, bulk actions, and
          more.
        </p>

        {/* Actions */}
        <div className="flex flex-col gap-3 sm:flex-row sm:gap-3">
          <a
            href="/pricing"
            className="inline-flex items-center justify-center gap-1.5 h-9 px-5 text-[13px] font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 transition-colors flex-1 sm:flex-none"
          >
            Upgrade to Pro &rarr;
          </a>
          <button
            onClick={onClose}
            className="inline-flex items-center justify-center h-9 px-4 text-[13px] font-medium rounded-lg border border-white/10 text-white/60 hover:text-white/90 hover:border-white/20 transition-colors flex-1 sm:flex-none"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
