import { Card, CardBody } from "@/components/ui/card";

/** Skeleton shown during Suspense fallback. Matches pulse-tab layout. */
export function OverviewSkeleton() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 animate-pulse">
      {/* Tab bar */}
      <div className="flex gap-6 border-b border-border-subtle pb-2">
        {[100, 80, 90, 80].map((w, i) => (
          <div key={i} className="h-3.5 bg-bg-elevated rounded" style={{ width: w }} />
        ))}
      </div>
      {/* Pulse strip — 4 metric cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardBody className="space-y-3 py-5">
              <div className="h-2.5 bg-bg-elevated rounded w-24" />
              <div className="h-7 bg-bg-elevated rounded w-20" />
            </CardBody>
          </Card>
        ))}
      </div>
      {/* Feed rows */}
      {[0, 1, 2].map((i) => (
        <Card key={i}>
          <CardBody className="space-y-2">
            <div className="h-3.5 bg-bg-elevated rounded w-48" />
            <div className="h-2.5 bg-bg-elevated rounded w-full" />
            <div className="h-2.5 bg-bg-elevated rounded w-3/4" />
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
