"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useStandaloneTasks as useStandaloneTasksSource } from "../utils/useStandaloneTasks";

export type StandaloneTasksValue = ReturnType<typeof useStandaloneTasksSource>;

const StandaloneTasksContext = createContext<StandaloneTasksValue | null>(null);

export function StandaloneTasksProvider({ children }: { children: ReactNode }) {
  const value = useStandaloneTasksSource();
  return (
    <StandaloneTasksContext.Provider value={value}>
      {children}
    </StandaloneTasksContext.Provider>
  );
}

export function useStandaloneTasks(): StandaloneTasksValue {
  const ctx = useContext(StandaloneTasksContext);
  if (!ctx) {
    throw new Error("useStandaloneTasks must be used within StandaloneTasksProvider");
  }
  return ctx;
}
