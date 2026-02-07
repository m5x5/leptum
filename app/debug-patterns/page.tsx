"use client";

import { useEffect, useState } from "react";
import { remoteStorageClient } from "../../lib/remoteStorage";
import { analyzeActivityPatterns } from "../../utils/activityAnalysis";

const loadAndAnalyze = async (
  setImpacts: (v: any[]) => void,
  setPatterns: (v: any[]) => void,
  setDebugInfo: (v: any[]) => void
) => {
  try {
    const loadedImpacts = await remoteStorageClient.getImpacts();
    setImpacts(loadedImpacts);

    if (loadedImpacts.length >= 2) {
      const sortedImpacts = [...loadedImpacts].sort((a, b) => a.date - b.date);

      const debug = [];
      for (let i = 1; i < sortedImpacts.length; i++) {
        const current = sortedImpacts[i];
        const previous = sortedImpacts[i - 1];
        const timeDiff = current.date - previous.date;
        const timeDiffHours = timeDiff / (60 * 60 * 1000);

        debug.push({
          index: i,
          previous: {
            activity: previous.activity,
            date: new Date(previous.date).toLocaleString(),
            metrics: {
              happiness: previous.happiness,
              confidence: previous.confidence,
              stress: previous.stress,
              energy: previous.energy,
            },
          },
          current: {
            activity: current.activity,
            date: new Date(current.date).toLocaleString(),
            metrics: {
              happiness: current.happiness,
              confidence: current.confidence,
              stress: current.stress,
              energy: current.energy,
            },
          },
          timeDiffHours: timeDiffHours.toFixed(2),
          tooLargeGap: timeDiffHours > 24,
        });
      }

      setDebugInfo(debug);

      const analyzedPatterns = analyzeActivityPatterns(loadedImpacts);
      setPatterns(analyzedPatterns);
    }
  } catch (error) {
    console.error("Failed to load impacts:", error);
  }
};

export default function DebugPatternsPage() {
  const [impacts, setImpacts] = useState<any[]>([]);
  const [patterns, setPatterns] = useState<any[]>([]);
  const [debugInfo, setDebugInfo] = useState<any[]>([]);

  useEffect(() => {
    loadAndAnalyze(setImpacts, setPatterns, setDebugInfo);
  }, []);

  return (
    <div className="max-w-6xl mx-auto pt-4 px-6 pb-32 md:pb-8">
      <h1 className="text-2xl font-bold text-foreground mb-6">Pattern Analysis Debug</h1>

      <div className="space-y-6">
        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-2">Summary</h2>
          <div className="space-y-1 text-sm">
            <p>Total Impacts: {impacts.length}</p>
            <p>Patterns Found: {patterns.length}</p>
            <p>Need at least 2 impacts with filled metrics to detect patterns</p>
          </div>
        </div>

        {patterns.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-4">
            <h2 className="text-lg font-semibold mb-4">Patterns Found</h2>
            <div className="space-y-4">
              {patterns.map((pattern, idx) => (
                <div key={idx} className="bg-muted p-3 rounded">
                  <h3 className="font-medium">{pattern.activity}</h3>
                  <p className="text-sm text-muted-foreground">Logged {pattern.totalLogs} times</p>
                  {pattern.positiveEffects?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-green-600">Positive:</p>
                      {pattern.positiveEffects.map((e: any) => (
                        <span key={e.metric} className="text-xs mr-2">
                          {e.metric} +{e.change}
                        </span>
                      ))}
                    </div>
                  )}
                  {pattern.negativeEffects?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-red-600">Negative:</p>
                      {pattern.negativeEffects.map((e: any) => (
                        <span key={e.metric} className="text-xs mr-2">
                          {e.metric} {e.change}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-4">
          <h2 className="text-lg font-semibold mb-4">Consecutive Impact Pairs</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Showing how each impact compares to the previous one. Patterns need:
          </p>
          <ul className="text-sm text-muted-foreground mb-4 list-disc list-inside">
            <li>Time gap &lt; 24 hours</li>
            <li>Both logs must have metric values filled in</li>
            <li>Change must be &gt; 5 points</li>
            <li>Need at least 2 occurrences of the same activity</li>
          </ul>

          {debugInfo.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No impact pairs to analyze. Need at least 2 logged impacts.
            </p>
          ) : (
            <div className="space-y-4">
              {debugInfo.map((info, idx) => (
                <div
                  key={idx}
                  className={`border rounded-lg p-3 ${info.tooLargeGap ? "border-red-500 bg-red-50 dark:bg-red-950" : "border-border"}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium">Pair #{info.index}</h3>
                    {info.tooLargeGap && (
                      <span className="text-xs bg-red-500 text-white px-2 py-1 rounded">
                        Gap too large ({info.timeDiffHours}h)
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Previous:</p>
                      <p className="font-semibold">{info.previous.activity}</p>
                      <p className="text-xs text-muted-foreground">{info.previous.date}</p>
                      <div className="mt-1 text-xs">
                        <p>Happiness: {info.previous.metrics.happiness ?? "not set"}</p>
                        <p>Confidence: {info.previous.metrics.confidence ?? "not set"}</p>
                        <p>Stress: {info.previous.metrics.stress ?? "not set"}</p>
                        <p>Energy: {info.previous.metrics.energy ?? "not set"}</p>
                      </div>
                    </div>

                    <div>
                      <p className="font-medium text-muted-foreground">Current:</p>
                      <p className="font-semibold">{info.current.activity}</p>
                      <p className="text-xs text-muted-foreground">{info.current.date}</p>
                      <div className="mt-1 text-xs">
                        <p>Happiness: {info.current.metrics.happiness ?? "not set"}</p>
                        <p>Confidence: {info.current.metrics.confidence ?? "not set"}</p>
                        <p>Stress: {info.current.metrics.stress ?? "not set"}</p>
                        <p>Energy: {info.current.metrics.energy ?? "not set"}</p>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground mt-2">
                    Time between logs: {info.timeDiffHours} hours
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
