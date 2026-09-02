"use client";

import { motion, useReducedMotion, type Transition } from "motion/react";

const HOVER_LIFT = 5;
const SIDE_ROTATION = 8;
const HOVER_SPRING: Transition = {
  type: "spring",
  stiffness: 970,
  damping: 55,
  mass: 1,
};
const HOVER_SHADOW = "0 8px 16px 0px rgba(0, 0, 0, 0.15)";

const CONTAINER_HEIGHT = 168;
const LEFT_CARD = { x: 0, y: 54, width: 220 };
const CENTER_CARD = { x: 0, y: 17, width: 199 };
const RIGHT_CARD = { x: 10, y: 73, width: 211 };

export function HeroStack() {
  const prefersReducedMotion = useReducedMotion();

  const hoverTarget = prefersReducedMotion
    ? undefined
    : { y: -HOVER_LIFT, boxShadow: HOVER_SHADOW, zIndex: 30 };

  const transition: Transition = prefersReducedMotion
    ? { duration: 0 }
    : HOVER_SPRING;

  return (
    <div
      className="mb-8 relative w-full max-w-xl"
      style={{ height: `${CONTAINER_HEIGHT}px` }}
    >
      <motion.div
        className="absolute z-10 rounded-card border border-border shadow-sm overflow-hidden bg-card will-change-transform"
        style={{
          top: `${LEFT_CARD.y}px`,
          left: `${LEFT_CARD.x}px`,
          width: `${LEFT_CARD.width}px`,
          background: "#ffffff",
          rotate: -SIDE_ROTATION,
        }}
        whileHover={hoverTarget}
        transition={transition}
      >
        <div className="px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sky-400" />
            <span className="text-sm font-semibold text-foreground/90">Today</span>
            <span className="ml-auto text-sky-700 font-semibold">2h 45m</span>
          </div>
          <div className="mt-2 space-y-1 text-foreground/85">
            <div>09:00 Deep work - Leptum landing</div>
            <div>10:30 Break + notes</div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute left-1/2 z-20 rounded-card border border-border shadow-md overflow-hidden bg-card will-change-transform"
        style={{
          top: `${CENTER_CARD.y}px`,
          x: `calc(-50% + ${CENTER_CARD.x}px)`,
          width: `${CENTER_CARD.width}px`,
          background: "#ffffff",
        }}
        whileHover={hoverTarget}
        transition={transition}
      >
        <div className="px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-sm font-semibold text-slate-800">Deep Work</span>
          </div>
          <div className="mt-2">
            <div className="inline-flex gap-1">
              {Array.from({ length: 12 }, (_, col) => (
                <div key={col} className="space-y-1">
                  {Array.from({ length: 7 }, (_, row) => {
                    const level = (col + row) % 4;
                    const cellClass =
                      level === 0
                        ? "bg-slate-100 border-slate-200"
                        : level === 1
                          ? "bg-emerald-100 border-emerald-200"
                          : level === 2
                            ? "bg-emerald-300 border-emerald-400"
                            : "bg-emerald-500 border-emerald-600";
                    return (
                      <div
                        key={`${col}-${row}`}
                        className={`h-2.5 w-2.5 rounded-[2px] border ${cellClass}`}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="absolute z-10 rounded-card border border-slate-200 shadow-sm overflow-hidden bg-white will-change-transform"
        style={{
          top: `${RIGHT_CARD.y}px`,
          right: `${-RIGHT_CARD.x}px`,
          width: `${RIGHT_CARD.width}px`,
          rotate: SIDE_ROTATION,
        }}
        whileHover={hoverTarget}
        transition={transition}
      >
        <div className="px-4 py-3 text-xs">
          <div className="flex items-center gap-2">
            <div
              className="relative h-[14px] w-[14px] rounded-full"
              style={{
                background: "conic-gradient(#d946ef 0deg 244deg, #f0abfc 244deg 360deg)",
              }}
            >
              <div className="absolute inset-[3px] rounded-full bg-[#ffffff]" />
            </div>
            <span className="text-sm font-semibold text-foreground/90">Morning Routine</span>
          </div>
          <div className="mt-2 space-y-1 text-foreground/90">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-fuchsia-500 bg-fuchsia-500 text-[10px] leading-none font-bold text-white">
                ✓
              </span>
              <span>Write homepage copy</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded border border-fuchsia-300 bg-white" />
              <span>Polish visual composition</span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
