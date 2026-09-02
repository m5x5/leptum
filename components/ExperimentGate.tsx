"use client";

import Link from "next/link";
import { BeakerIcon } from "@heroicons/react/outline";
import { EXPERIMENTS, useEnabledExperiments, type ExperimentId } from "../lib/experiments";

/**
 * Renders children only when the given experiment is enabled. Otherwise shows a
 * notice pointing to Settings › Experiments. Renders nothing until the local
 * flag has been read, so the disabled notice never flashes for enabled users.
 */
export function ExperimentGate({ id, children }: { id: ExperimentId; children: React.ReactNode }) {
  const { enabled, ready } = useEnabledExperiments();
  if (!ready) return null;
  if (enabled.has(id)) return <>{children}</>;

  const experiment = EXPERIMENTS.find((e) => e.id === id);
  return (
    <div className="max-w-md mx-auto px-4 py-16 text-center">
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <BeakerIcon className="h-6 w-6" aria-hidden />
      </div>
      <h1 className="text-lg font-semibold mb-2">{experiment?.label ?? "This feature"} is an experiment</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {experiment?.description} It&apos;s turned off by default — enable it under Settings › Experiments.
      </p>
      <Link
        href="/settings#experiments"
        className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Open Settings
      </Link>
    </div>
  );
}
