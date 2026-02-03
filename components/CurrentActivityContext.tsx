"use client";

import { createContext, useContext } from "react";

export type CurrentActivity = {
  name: string;
  startTime: number;
  goalId?: string;
} | null;

export const CurrentActivityContext = createContext<CurrentActivity>(null);

export function useCurrentActivity() {
  return useContext(CurrentActivityContext);
}
