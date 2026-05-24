"use client";

/**
 * Checkout button — calls POST /api/stripe/checkout and redirects to Stripe.
 * Client component so it can handle the loading state without SSR.
 */

import { useState } from "react";

export function CheckoutButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json() as { url?: string; error?: string };
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error ?? "Checkout failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="w-full px-4 py-2.5 rounded-md bg-intel-500 hover:bg-intel-600 disabled:opacity-60 disabled:cursor-wait text-text-primary font-medium transition-colors text-sm"
      >
        {loading ? "Redirecting to Stripe…" : "Upgrade to Pro →"}
      </button>
      {error && (
        <p className="text-waste-500 text-xs font-mono">{error}</p>
      )}
    </div>
  );
}
