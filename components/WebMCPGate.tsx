"use client";

import { usePathname } from "next/navigation";
import { WebMCPProvider } from "./WebMCPProvider";

export function WebMCPGate() {
  const pathname = usePathname();
  const activePath = pathname?.split("?")[0].split("#")[0] ?? "/";

  if (activePath === "/") return null;
  return <WebMCPProvider />;
}

