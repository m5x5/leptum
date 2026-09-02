"use client";

import { useState, useRef, useEffect, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GitBranch } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { HeroStack } from "./HeroStack";
import { HomeLogo } from "./HomeLogo";
import { DialKitPanel } from "./DialKitPanel";
import { Button } from "../ui/button";
import { remoteStorageClient, StandaloneTask } from "../../lib/remoteStorage";
import { solidRestore } from "../../lib/solidAuth";

const makerSite = "https://mpeters.dev";
const makerGithub = "https://github.com/m5x5/leptum";
const makerPortfolioApps = "https://apps.mpeters.dev";

export default function LandingPageContent({ capabilityFooter }: { capabilityFooter?: React.ReactNode } = {}) {
  const router = useRouter();
  const [view, setView] = useState<"hero" | "onboarding">("hero");
  const [taskName, setTaskName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [taskError, setTaskError] = useState<string | null>(null);
  const [solidLoggedIn, setSolidLoggedIn] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Restoring a Solid session here only checks for one that already exists —
  // OIDC redirects always land on /settings (see lib/solidAuth.ts), never here.
  useEffect(() => {
    let cancelled = false;
    solidRestore()
      .then((session) => {
        if (!cancelled) setSolidLoggedIn(session.isActive);
      })
      .catch(() => {
        if (!cancelled) setSolidLoggedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openOnboarding = () => {
    if (solidLoggedIn) {
      router.push("/app");
      return;
    }
    setView("onboarding");
    // Wait for the slide transition's layout to settle before focusing. preventScroll is
    // required: the clipped track is a scroll container, so a scrolling focus would shove
    // the onboarding panel a full viewport further left, leaving a blank screen.
    requestAnimationFrame(() =>
      requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true })),
    );
  };

  const handleCreateFirstTask = async (e: FormEvent) => {
    e.preventDefault();
    const name = taskName.trim();
    if (!name || submitting) return;
    setSubmitting(true);
    setTaskError(null);
    try {
      const newTask: StandaloneTask = {
        id: uuidv4(),
        name,
        status: "due",
        createdAt: Date.now(),
      };
      await remoteStorageClient.addStandaloneTask(newTask);
      router.push("/app");
    } catch (error) {
      console.error("Failed to create first task:", error);
      setTaskError(error instanceof Error ? error.message : "Could not save the task.");
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-[calc(100vh-56px)] md:min-h-screen bg-background text-foreground overflow-clip">
      <div
        className="flex w-[200%] transition-transform duration-500 ease-out"
        style={{ transform: view === "onboarding" ? "translateX(-50%)" : "translateX(0%)" }}
      >
        {/* ── Screen 1: hero ─────────────────────────────────────────── */}
        <div className="w-1/2 shrink-0" aria-hidden={view !== "hero"} inert={view !== "hero" || undefined}>
          <div className="mx-auto max-w-6xl px-6 pt-10 pb-0 md:pt-16 md:pb-0">
            <div className="flex items-center justify-between gap-4">
              <HomeLogo />
              <a
                href={makerGithub}
                target="_blank"
                rel="noreferrer"
                aria-label="View source code"
                title="View source code"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <GitBranch aria-hidden="true" className="h-4 w-4" />
              </a>
            </div>

            <div className="mt-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
              <section className="lg:col-span-7">
                <HeroStack />

                <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
                  Your day, structured — with data you own.
                </h1>
                <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
                  Time Tracker + Goals + Routines + Local-first
                </p>

                <div className="mt-10 mb-10 flex flex-col sm:flex-row gap-3">
                  <Button
                    type="button"
                    onClick={openOnboarding}
                    className="shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
                  >
                    {solidLoggedIn ? "Open the app" : "Get started"}
                  </Button>
                  {!solidLoggedIn && (
                    <Link
                      href="/settings"
                      className="min-h-[44px] inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 font-medium text-foreground hover:bg-muted/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    >
                      Login
                    </Link>
                  )}
                </div>

                <div className="mt-8 overflow-hidden rounded-card border border-border">
                  <div className="divide-y divide-border bg-background/40">
                    {[
                      {
                        title: "Timeline + Wellbeing",
                        body: "Log what you did and how it felt, then learn patterns over time.",
                      },
                      {
                        title: "Routines",
                        body: "CRON scheduling and location triggers to reduce decision fatigue.",
                      },
                      {
                        title: "Local-first",
                        body: "Bring your own Solid Pod and keep your data under your control.",
                      },
                    ].map((f) => (
                      <div key={f.title} className="px-4 py-4">
                        <div className="text-base font-medium text-foreground">{f.title}</div>
                        <div className="mt-1 text-sm text-muted-foreground">{f.body}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-8 overflow-hidden rounded-card border border-border relative bg-background/40">
                  <div
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0"
                    style={{
                      backgroundImage: "radial-gradient(circle, hsl(var(--foreground) / 0.35) 1px, transparent 1.2px)",
                      backgroundSize: "10px 10px",
                      WebkitMaskImage:
                        "radial-gradient(120% 120% at 100% 100%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.68) 32%, rgba(0,0,0,0.32) 56%, rgba(0,0,0,0.10) 74%, transparent 88%)",
                      maskImage:
                        "radial-gradient(120% 120% at 100% 100%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.68) 32%, rgba(0,0,0,0.32) 56%, rgba(0,0,0,0.10) 74%, transparent 88%)",
                    }}
                  />

                  <div className="relative px-4 py-4">
                    <div className="text-sm text-muted-foreground">
                      Made by Michael. Browse my full portfolio of apps at{" "}
                      <a
                        href={makerPortfolioApps}
                        target="_blank"
                        rel="noreferrer"
                        className="font-semibold text-foreground hover:underline rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        apps.mpeters.dev
                      </a>
                      .
                    </div>

                    <div className="mt-4 flex flex-col sm:flex-row gap-3">
                      <a
                        href={makerSite}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[44px] inline-flex items-center justify-center rounded-full border border-border bg-card px-5 py-2.5 font-medium text-foreground hover:bg-muted/50 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        Who am I?
                      </a>
                      <a
                        href={makerPortfolioApps}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[44px] inline-flex items-center justify-center rounded-full bg-primary text-primary-foreground px-5 py-2.5 font-medium hover:bg-primary/90 transition shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                      >
                        See all apps
                      </a>
                    </div>
                  </div>
                </div>

                <footer className="mt-4">{capabilityFooter}</footer>
              </section>

              <aside className="lg:col-span-5 hidden lg:block" aria-hidden="true" />
            </div>
          </div>
          <DialKitPanel />
        </div>

        {/* ── Screen 2: onboarding — create your first task ─────────────── */}
        <div className="w-1/2 shrink-0" aria-hidden={view !== "onboarding"} inert={view !== "onboarding" || undefined}>
          <div className="mx-auto flex min-h-[calc(100vh-56px)] md:min-h-screen max-w-xl flex-col justify-center px-6">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setView("hero")}
              className="mb-8 self-start text-muted-foreground"
            >
              <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
                <path d="M9.78 4.22a.75.75 0 0 1 0 1.06L7.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L5.47 8.53a.75.75 0 0 1 0-1.06l3.25-3.25a.75.75 0 0 1 1.06 0Z" />
              </svg>
              Back
            </Button>

            <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
              What&apos;s one thing you want to get done today?
            </h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">
              Connect a Solid Pod in Settings first so this task can be saved to your storage.
            </p>

            <form onSubmit={handleCreateFirstTask} className="mt-8">
              <label htmlFor="first-task" className="sr-only">
                Your first task
              </label>
              <input
                ref={inputRef}
                id="first-task"
                type="text"
                value={taskName}
                onChange={(e) => {
                  setTaskName(e.target.value);
                  if (taskError) setTaskError(null);
                }}
                placeholder="e.g. Reply to emails"
                autoComplete="off"
                disabled={submitting}
                className="w-full min-h-[52px] rounded-control border border-border bg-card px-4 text-base text-foreground placeholder:text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring transition disabled:opacity-60"
              />
              {taskError && (
                <p className="mt-3 text-sm text-destructive">
                  {taskError}
                </p>
              )}
              <Button
                type="submit"
                disabled={!taskName.trim() || submitting}
                className="mt-4 w-full shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
              >
                {submitting ? "Adding…" : "Add it & open Leptum"}
              </Button>

            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
