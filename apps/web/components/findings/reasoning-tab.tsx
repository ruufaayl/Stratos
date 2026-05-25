import { Card, CardBody } from "@/components/ui/card";
import { Empty } from "@/components/ui/empty";

interface ReasoningTabProps {
  explanation: string | null;
}

export function ReasoningTab({ explanation }: ReasoningTabProps) {
  if (!explanation) {
    return (
      <Empty
        title="No reasoning yet"
        body="The Claude reasoning layer annotates findings after each scan. If this finding is recent, check back in a few minutes."
      />
    );
  }

  return (
    <Card>
      <CardBody>
        <div className="flex items-center gap-2 mb-3">
          <span className="font-mono uppercase text-xs text-text-muted tracking-widest">
            Claude · Reasoning
          </span>
        </div>
        <div className="text-text-primary text-sm leading-relaxed whitespace-pre-wrap">
          {explanation}
        </div>
      </CardBody>
    </Card>
  );
}
