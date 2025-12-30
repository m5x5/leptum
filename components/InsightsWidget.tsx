import { useState, useEffect } from "react";
import Link from "next/link";
import { LightBulbIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { useInsights } from "../utils/useInsights";
import { remoteStorageClient } from "../lib/remoteStorage";
import { analyzeActivityPatterns, getSuggestionsForMetrics } from "../utils/activityAnalysis";

interface InsightsWidgetProps {
  className?: string;
}

export default function InsightsWidget({ className = "" }: InsightsWidgetProps) {
  const { insights, loading } = useInsights();
  const [lowMetrics, setLowMetrics] = useState<{ metric: string; value: number }[]>([]);
  const [relevantInsights, setRelevantInsights] = useState<any[]>([]);
  const [discoveredPatterns, setDiscoveredPatterns] = useState<any[]>([]);

  useEffect(() => {
    analyzeMood();
  }, [insights]);

  const analyzeMood = async () => {
    try {
      // Get the latest impact log
      const impacts = await remoteStorageClient.getImpacts();
      if (impacts.length === 0) return;

      const latestImpact = impacts[impacts.length - 1];

      // Analyze patterns from all impact data
      const patterns = analyzeActivityPatterns(impacts);

      // Identify metrics that are low
      const metrics = [
        'happiness',
        'confidence',
        'stress',
        'cleanliness',
        'fulfillment',
        'motivation',
        'energy',
        'focus',
        'shame',
        'guilt'
      ];

      const low: { metric: string; value: number }[] = [];

      metrics.forEach(metric => {
        const value = parseInt(latestImpact[metric]);
        if (!isNaN(value)) {
          // For bipolar metrics (happiness, confidence), consider < -20 as low
          if ((metric === 'happiness' || metric === 'confidence') && value < -20) {
            low.push({ metric, value });
          }
          // For inverted metrics (stress, shame, guilt), consider > 60 as "low" (high stress)
          else if ((metric === 'stress' || metric === 'shame' || metric === 'guilt') && value > 60) {
            low.push({ metric, value });
          }
          // For normal metrics, consider < 40 as low
          else if (
            metric !== 'happiness' &&
            metric !== 'confidence' &&
            metric !== 'stress' &&
            metric !== 'shame' &&
            metric !== 'guilt' &&
            value < 40
          ) {
            low.push({ metric, value });
          }
        }
      });

      setLowMetrics(low);

      // Find insights that could help with these low metrics
      const relevant = insights.filter(insight =>
        insight.affectedMetrics.some(am => {
          const isLow = low.some(l => l.metric === am.metric);

          // For inverted metrics (stress, shame, guilt), we want insights that decrease them
          if ((am.metric === 'stress' || am.metric === 'shame' || am.metric === 'guilt')) {
            return isLow && am.effect === 'negative';
          }

          // For normal metrics, we want insights that increase them
          return isLow && am.effect === 'positive';
        })
      );

      setRelevantInsights(relevant.slice(0, 2)); // Show max 2 manual insights

      // Find discovered patterns that could help
      const lowMetricNames = low.map(l => l.metric);
      const relevantPatterns = patterns.filter(pattern =>
        pattern.positiveEffects.some(effect =>
          lowMetricNames.includes(effect.metric)
        )
      );

      setDiscoveredPatterns(relevantPatterns.slice(0, 2)); // Show max 2 patterns
    } catch (error) {
      console.error('Failed to analyze mood:', error);
    }
  };

  if (loading) return null;
  if (insights.length === 0) {
    return (
      <Link href="/impact#insights">
        <div className={`bg-card border border-border rounded-lg p-4 hover:shadow-md transition cursor-pointer ${className}`}>
          <div className="flex items-center gap-2 mb-2">
            <LightBulbIcon className="w-5 h-5 text-yellow-500" />
            <h3 className="font-semibold text-foreground">What Helps</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Start tracking what improves your wellbeing
          </p>
          <div className="flex items-center justify-between text-sm text-primary">
            <span>Add your first insight</span>
            <ChevronRightIcon className="w-4 h-4" />
          </div>
        </div>
      </Link>
    );
  }

  if (lowMetrics.length === 0 || (relevantInsights.length === 0 && discoveredPatterns.length === 0)) {
    return (
      <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <LightBulbIcon className="w-5 h-5 text-green-500" />
          <h3 className="font-semibold text-foreground">What Helps</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          {lowMetrics.length === 0
            ? "You're doing great! Keep it up!"
            : "Log an impact entry to get personalized suggestions"}
        </p>
        <Link href="/impact#insights">
          <div className="flex items-center justify-between text-sm text-primary hover:underline cursor-pointer">
            <span>View all insights</span>
            <ChevronRightIcon className="w-4 h-4" />
          </div>
        </Link>
      </div>
    );
  }

  const getMetricDisplayName = (metric: string) => {
    return metric.charAt(0).toUpperCase() + metric.slice(1);
  };

  return (
    <div className={`bg-card border border-border rounded-lg p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <LightBulbIcon className="w-5 h-5 text-yellow-500" />
        <h3 className="font-semibold text-foreground">What Might Help</h3>
      </div>

      {/* Show low metrics */}
      <div className="mb-3">
        <p className="text-xs text-muted-foreground mb-2">
          Could use a boost:
        </p>
        <div className="flex flex-wrap gap-2">
          {lowMetrics.slice(0, 3).map(({ metric, value }) => (
            <span
              key={metric}
              className="text-xs px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded capitalize"
            >
              {getMetricDisplayName(metric)} ({value})
            </span>
          ))}
        </div>
      </div>

      {/* Show suggestions */}
      <div className="space-y-2 mb-3">
        {/* Discovered patterns */}
        {discoveredPatterns.map((pattern, index) => (
          <div
            key={`pattern-${index}`}
            className="flex items-center gap-2 p-2 bg-primary/5 rounded-lg hover:bg-primary/10 transition border border-primary/20"
          >
            <span className="text-2xl">📊</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {pattern.activity}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {pattern.positiveEffects
                  .filter((effect: any) => lowMetrics.some(l => l.metric === effect.metric))
                  .map((effect: any) => (
                    <span
                      key={effect.metric}
                      className="text-xs text-green-600 dark:text-green-400 capitalize"
                    >
                      ↑ {effect.metric} +{effect.change}
                    </span>
                  ))}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Based on {pattern.totalLogs} logged {pattern.totalLogs === 1 ? 'time' : 'times'}
              </p>
            </div>
          </div>
        ))}

        {/* Manual insights */}
        {relevantInsights.map(insight => (
          <div
            key={insight.id}
            className="flex items-center gap-2 p-2 bg-muted/50 rounded-lg hover:bg-muted transition"
          >
            <span className="text-2xl">💡</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {insight.name}
              </p>
              <div className="flex flex-wrap gap-1 mt-1">
                {insight.affectedMetrics
                  .filter((am: any) => lowMetrics.some(l => l.metric === am.metric))
                  .map((am: any) => (
                    <span
                      key={am.metric}
                      className="text-xs text-green-600 dark:text-green-400 capitalize"
                    >
                      {am.effect === 'positive' ? '↑' : '↓'} {am.metric}
                    </span>
                  ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      <Link href="/impact#insights">
        <div className="flex items-center justify-between text-sm text-primary hover:underline cursor-pointer">
          <span>Manage insights</span>
          <ChevronRightIcon className="w-4 h-4" />
        </div>
      </Link>
    </div>
  );
}
