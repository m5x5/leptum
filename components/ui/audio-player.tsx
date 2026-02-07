"use client";

import * as React from "react";
import { useRef, useEffect, useState, useMemo } from "react";
import { useWavesurfer } from "@wavesurfer/react";
import { PlayIcon, PauseIcon } from "@heroicons/react/solid";
import { cn } from "../../lib/utils";
import { Button } from "./button";

/** Read HSL CSS variable (e.g. "222.2 47.4% 11.2%") and return hsl(h, s%, l%) for canvas/JS. */
function getHslFromCssVar(varName: string): string {
  if (typeof document === "undefined") return "hsl(220, 50%, 50%)";
  const value = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
  if (!value) return "hsl(220, 50%, 50%)";
  const parts = value.split(/\s+/);
  if (parts.length >= 3) {
    const [h, s, l] = [parts[0], parts[1].replace("%", ""), parts[2].replace("%", "")];
    return `hsl(${h}, ${s}%, ${l}%)`;
  }
  return "hsl(220, 50%, 50%)";
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export interface AudioPlayerProps {
  /** Audio URL (blob or http). */
  src: string;
  /** Optional label/title above the waveform. */
  title?: string;
  className?: string;
  /** Compact layout (e.g. for note cards). */
  compact?: boolean;
  /** Callback when playback ends. */
  onEnded?: () => void;
}

export function AudioPlayer({ src, title, className, compact, onEnded }: AudioPlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [themeWave, setThemeWave] = useState("hsl(215, 20%, 65%)");
  const [themeProgress, setThemeProgress] = useState("hsl(222, 47%, 11%)");

  useEffect(() => {
    queueMicrotask(() => {
      setThemeWave(getHslFromCssVar("--muted-foreground"));
      setThemeProgress(getHslFromCssVar("--primary"));
    });
  }, []);

  const options = useMemo(
    () => ({
      url: src,
      waveColor: themeWave,
      progressColor: themeProgress,
      height: compact ? 40 : 56,
      barWidth: 2,
      barGap: 1,
      barRadius: 1,
      cursorWidth: 2,
      cursorColor: themeProgress,
      normalize: true,
      interact: true,
    }),
    [src, themeWave, themeProgress, compact]
  );

  const { wavesurfer, isReady, isPlaying, currentTime } = useWavesurfer({
    container: containerRef,
    ...options,
  });

  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!wavesurfer) return;
    const onReady = () => setDuration(wavesurfer.getDuration());
    wavesurfer.on("ready", onReady);
    if (isReady) queueMicrotask(() => setDuration(wavesurfer.getDuration()));
    return () => {
      wavesurfer.un("ready", onReady);
    };
  }, [wavesurfer, isReady]);

  useEffect(() => {
    if (!wavesurfer || !onEnded) return;
    const onFinish = () => onEnded();
    wavesurfer.on("finish", onFinish);
    return () => wavesurfer.un("finish", onFinish);
  }, [wavesurfer, onEnded]);

  const handlePlayPause = () => {
    wavesurfer?.playPause();
  };

  if (!src) return null;

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-3 text-card-foreground",
        compact && "p-2",
        className
      )}
    >
      {title && (
        <div className="mb-1.5 text-xs font-medium text-muted-foreground">{title}</div>
      )}
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={handlePlayPause}
          disabled={!isReady}
          className="shrink-0"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <PauseIcon className="h-4 w-4" />
          ) : (
            <PlayIcon className="h-4 w-4" />
          )}
        </Button>
        <div className="flex-1 min-w-0">
          <div ref={containerRef} className="w-full" />
        </div>
        {isReady && (
          <div className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {formatTime(currentTime)} / {formatTime(duration)}
          </div>
        )}
      </div>
    </div>
  );
}
