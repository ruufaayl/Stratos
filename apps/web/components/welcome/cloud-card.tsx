"use client";
import * as React from "react";
import Link from "next/link";
// TODO: replace with brand logos (AWS, Azure, GCP) once assets are available
import { Cloud as CloudIcon, Server as ServerIcon, Globe as GlobeIcon } from "lucide-react";
import { Card, CardBody, CardFooter } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";

export type CloudProvider = "aws" | "azure" | "gcp";
export type Status = "available" | "coming-soon" | "connected";

export type CloudCardProps = {
  cloud: CloudProvider;
  status: Status;
  href: string;
  connectedCount?: number;
};

const CLOUD_META: Record<
  CloudProvider,
  { label: string; Icon: React.ElementType }
> = {
  aws:   { label: "AWS",              Icon: CloudIcon  },
  azure: { label: "Microsoft Azure",  Icon: ServerIcon },
  gcp:   { label: "Google Cloud",     Icon: GlobeIcon  },
};

function CardContent({ cloud, status, connectedCount }: Omit<CloudCardProps, "href">) {
  const { label, Icon } = CLOUD_META[cloud];


  const intentMap: Record<Status, React.ComponentProps<typeof Card>["intent"]> = {
    available:    "default",
    "coming-soon": "default",
    connected:    "savings",
  };

  return (
    <Card
      intent={intentMap[status]}
      hover="lift"
      className={`w-60 select-none ${status === "coming-soon" ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <CardBody className="flex flex-col items-center gap-3 py-8">
        {/* Cloud icon — TODO: replace with brand logos */}
        <Icon className="w-10 h-10 text-text-muted" aria-hidden="true" />
        <span className="font-mono text-mono-sm text-text-primary font-semibold tracking-wide">
          {label}
        </span>

        {/* Status chip */}
        {status === "available" && (
          <Chip kind="intelligence">Available</Chip>
        )}
        {status === "coming-soon" && (
          <Chip kind="neutral">Coming soon</Chip>
        )}
        {status === "connected" && (
          <Chip kind="savings">&#x2713; Connected</Chip>
        )}
        {status === "connected" && connectedCount !== undefined && (
          <span className="text-mono-sm font-mono text-text-faint">
            ({connectedCount} accounts)
          </span>
        )}
      </CardBody>

      {/* CTA footer */}
      {status !== "coming-soon" && (
        <CardFooter className="flex justify-center py-3 border-t border-border-subtle">
          {status === "available" && (
            <Button intent="primary" size="sm">Connect &rarr;</Button>
          )}
          {status === "connected" && (
            <Button intent="secondary" size="sm">View &rarr;</Button>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

export function CloudCard({ cloud, status, href, connectedCount }: CloudCardProps) {
  if (status === "coming-soon") {
    // Not a link — cursor not-allowed, no href
    return (
      <div aria-disabled="true">
        <CardContent cloud={cloud} status={status} connectedCount={connectedCount} />
      </div>
    );
  }

  return (
    <Link href={href} className="block no-underline">
      <CardContent cloud={cloud} status={status} connectedCount={connectedCount} />
    </Link>
  );
}
