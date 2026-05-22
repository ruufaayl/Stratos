export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-6">
      <div className="max-w-2xl text-center space-y-6">
        <div className="inline-flex items-center gap-2 text-fg-muted text-data-sm font-mono">
          <span className="size-2 rounded-full bg-good animate-pulse-dot" />
          phase 0 — foundation
        </div>
        <h1 className="text-4xl md:text-6xl font-semibold tracking-tight">
          Stratos
        </h1>
        <p className="text-fg-muted text-lg">
          The intelligent layer above your cloud.
          <br />
          <span className="text-fg">Your cloud, optimized. Automatically.</span>
        </p>
        <div className="pt-4 text-fg-subtle text-sm font-mono">
          engine status:{" "}
          <a
            href="/engine/health"
            className="text-brand hover:text-brand-hover underline underline-offset-4"
          >
            /engine/health
          </a>
        </div>
      </div>
    </main>
  );
}
