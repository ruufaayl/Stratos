"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AuthCard } from "@/components/auth/auth-card";
import { SlugInput } from "@/components/auth/slug-input";
import { SigilPicker, sigilColorFromString } from "@/components/auth/sigil-picker";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function CreateOrgPage() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [sigil, setSigil] = React.useState("#6366F1");
  const [slugDirty, setSlugDirty] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Auto-derive slug from name until the user manually edits it
  React.useEffect(() => {
    if (!slugDirty) {
      setSlug(slugify(name));
    }
  }, [name, slugDirty]);

  // Auto-derive sigil color from name
  React.useEffect(() => {
    if (name) {
      setSigil(sigilColorFromString(name));
    }
  }, [name]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch("/api/orgs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, slug, sigilColor: sigil }),
    });
    const data = (await res.json()) as { orgSlug?: string; error?: string };

    if (!res.ok) {
      setError(data.error ?? "Couldn't create organization");
      setSubmitting(false);
      return;
    }

    router.push(`/app/${data.orgSlug}/welcome`);
  };

  return (
    <AuthCard
      title="Create your organization"
      subtitle="One org per company, team, or environment."
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">
            Organization name
          </label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme, Inc."
            required
            autoFocus
          />
        </div>

        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">
            URL slug
          </label>
          <SlugInput
            value={slug}
            onChange={(v) => {
              setSlug(v);
              setSlugDirty(true);
            }}
          />
          <p className="text-text-faint text-xs font-mono mt-1">
            stratos.dev/app/
            <span className="text-text-muted">{slug || "your-slug"}</span>
          </p>
        </div>

        <div>
          <label className="text-sm text-text-muted font-mono mb-1.5 block">
            Sigil color
          </label>
          <SigilPicker value={sigil} onChange={setSigil} />
        </div>

        {error && (
          <div className="text-waste-500 text-xs font-mono">{error}</div>
        )}

        <Button
          type="submit"
          disabled={submitting || !name || !slug}
          className="w-full"
        >
          {submitting ? "Creating…" : "Create organization"}
        </Button>
      </form>
    </AuthCard>
  );
}
