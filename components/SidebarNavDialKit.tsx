"use client";

import { useDialKit, type TransitionConfig } from "dialkit";

function transitionToCssVars(t: TransitionConfig): { duration: string; easing: string } {
  if (t.type === "easing") {
    const [x1, y1, x2, y2] = t.ease;
    return {
      duration: `${t.duration}ms`,
      easing: `cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})`,
    };
  }
  const ms = Math.round(Math.min(Math.max(t.visualDuration ?? 320, 40), 1200));
  return {
    duration: `${ms}ms`,
    easing: "cubic-bezier(0.34, 1.2, 0.64, 1)",
  };
}

/**
 * DialKit-driven hover / selected / pressed colors for [data-sidebar="menu-button"],
 * plus transition duration & easing (DialKit “transition” control — curve + duration).
 * The current route (selected) does not change on hover.
 */
export function SidebarNavDialKit({ children }: { children: React.ReactNode }) {
  const p = useDialKit("Navbar items", {
    hoverBackground: { type: "color" as const, default: "#f4f7fa" },
    hoverForeground: { type: "color" as const, default: "#0f172a" },
    selectedBackground: { type: "color" as const, default: "#ebeff5" },
    selectedForeground: { type: "color" as const, default: "#0f172a" },
    pressedBackground: { type: "color" as const, default: "#eceff4" },
    pressedForeground: { type: "color" as const, default: "#0f172a" },
    navInteraction: {
      type: "easing" as const,
      duration: 200,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  });

  const motion = transitionToCssVars(p.navInteraction);

  const style = {
    ["--sidebar-nav-hover-bg" as string]: p.hoverBackground,
    ["--sidebar-nav-hover-fg" as string]: p.hoverForeground,
    ["--sidebar-nav-selected-bg" as string]: p.selectedBackground,
    ["--sidebar-nav-selected-fg" as string]: p.selectedForeground,
    ["--sidebar-nav-pressed-bg" as string]: p.pressedBackground,
    ["--sidebar-nav-pressed-fg" as string]: p.pressedForeground,
    ["--sidebar-nav-duration" as string]: motion.duration,
    ["--sidebar-nav-easing" as string]: motion.easing,
  } as React.CSSProperties;

  return (
    <div className="sidebar-nav-dialkit h-full min-h-0" style={style}>
      {children}
    </div>
  );
}
