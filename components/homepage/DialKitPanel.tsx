"use client";

import { DialRoot } from "dialkit";
import "dialkit/styles.css";

export function DialKitPanel() {
  return <DialRoot position="bottom-right" defaultOpen={false} theme="system" />;
}
