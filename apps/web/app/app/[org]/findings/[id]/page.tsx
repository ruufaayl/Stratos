import Link from "next/link";
import { Empty } from "@/components/ui/empty";
import { Chip } from "@/components/ui/chip";

export default function FindingDetailPage({
  params,
}: {
  params: { org: string; id: string };
}) {
  return (
    <div className="max-w-3xl mx-auto px-6 py-12 space-y-4">
      <div className="flex items-center gap-3">
        <div className="font-mono text-[11px] text-text-faint">
          STRATOS · FINDINGS
        </div>
        <Chip kind="neutral">Wave 2</Chip>
      </div>
      <Empty
        title="Finding detail"
        body="Deep-dive evidence, full math breakdown, Claude reasoning, and one-click remediation land in the next release."
        action={
          <Link
            href={`/app/${params.org}?tab=feed`}
            className="inline-flex items-center justify-center gap-2 font-medium transition-colors duration-150 ease-out h-9 px-3.5 text-[13px] rounded bg-bg-elevated text-text-primary border border-border-subtle hover:border-border-strong"
          >
            Back to findings
          </Link>
        }
      />
    </div>
  );
}
