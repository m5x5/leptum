// Analyze impact data to discover which activities affect metrics

export interface ActivityEffect {
  activity: string;
  metric: string;
  averageChange: number;
  occurrences: number;
  direction: 'increase' | 'decrease';
}

export interface MetricReference {
  date: number;
  previousValue: number;
  currentValue: number;
  change: number;
}

export interface ActivityPattern {
  activity: string;
  positiveEffects: { metric: string; change: number; references: MetricReference[] }[];
  negativeEffects: { metric: string; change: number; references: MetricReference[] }[];
  totalLogs: number;
}

const METRICS = [
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

// Inverted metrics where lower is better
const INVERTED_METRICS = ['stress', 'shame', 'guilt'];

/**
 * Analyze impact logs to discover which activities affect which metrics
 * Compares metric values before and after an activity
 */
export function analyzeActivityPatterns(impacts: any[]): ActivityPattern[] {
  if (impacts.length < 2) return [];

  // Sort by date to ensure correct order
  const sortedImpacts = [...impacts].sort((a, b) => a.date - b.date);

  // Track changes for each activity with references
  const activityMetricChanges: Record<string, Record<string, { change: number; reference: MetricReference }[]>> = {};
  const activityCounts: Record<string, number> = {};

  // Compare each impact with the previous one
  for (let i = 1; i < sortedImpacts.length; i++) {
    const current = sortedImpacts[i];
    const previous = sortedImpacts[i - 1];

    // Skip if time gap is too large (more than 24 hours)
    const timeDiff = current.date - previous.date;
    if (timeDiff > 24 * 60 * 60 * 1000) continue;

    const activity = current.activity;
    if (!activity) continue;

    // Initialize tracking for this activity
    if (!activityMetricChanges[activity]) {
      activityMetricChanges[activity] = {};
      activityCounts[activity] = 0;
    }
    activityCounts[activity]++;

    // Compare each metric
    METRICS.forEach(metric => {
      const currentValue = parseFloat(current[metric]);
      const previousValue = parseFloat(previous[metric]);

      // Only track if both values exist and are valid numbers
      if (!isNaN(currentValue) && !isNaN(previousValue)) {
        const change = currentValue - previousValue;

        if (!activityMetricChanges[activity][metric]) {
          activityMetricChanges[activity][metric] = [];
        }

        activityMetricChanges[activity][metric].push({
          change,
          reference: {
            date: current.date,
            previousValue,
            currentValue,
            change
          }
        });
      }
    });
  }

  // Calculate patterns for each activity
  const patterns: ActivityPattern[] = [];

  Object.keys(activityMetricChanges).forEach(activity => {
    const positiveEffects: { metric: string; change: number; references: MetricReference[] }[] = [];
    const negativeEffects: { metric: string; change: number; references: MetricReference[] }[] = [];

    METRICS.forEach(metric => {
      const changesWithRefs = activityMetricChanges[activity][metric];
      if (!changesWithRefs || changesWithRefs.length < 1) return; // Need at least 1 data point

      const changes = changesWithRefs.map(c => c.change);
      const references = changesWithRefs.map(c => c.reference);
      const averageChange = changes.reduce((sum, val) => sum + val, 0) / changes.length;

      // Only consider significant changes (absolute value > 5)
      if (Math.abs(averageChange) > 5) {
        const isInverted = INVERTED_METRICS.includes(metric);

        // For inverted metrics (stress, shame, guilt), negative change is good
        // For normal metrics, positive change is good
        const isPositiveEffect = isInverted ? averageChange < 0 : averageChange > 0;

        if (isPositiveEffect) {
          positiveEffects.push({ metric, change: Math.round(averageChange), references });
        } else {
          negativeEffects.push({ metric, change: Math.round(averageChange), references });
        }
      }
    });

    // Only include activities that have at least one effect
    if (positiveEffects.length > 0 || negativeEffects.length > 0) {
      patterns.push({
        activity,
        positiveEffects: positiveEffects.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
        negativeEffects: negativeEffects.sort((a, b) => Math.abs(b.change) - Math.abs(a.change)),
        totalLogs: activityCounts[activity]
      });
    }
  });

  // Sort by total number of positive effects and occurrences
  return patterns.sort((a, b) => {
    const scoreA = a.positiveEffects.length * 10 + a.totalLogs;
    const scoreB = b.positiveEffects.length * 10 + b.totalLogs;
    return scoreB - scoreA;
  });
}

/**
 * Get suggestions based on current low metrics
 */
export function getSuggestionsForMetrics(
  patterns: ActivityPattern[],
  lowMetrics: string[]
): ActivityPattern[] {
  return patterns.filter(pattern =>
    pattern.positiveEffects.some(effect =>
      lowMetrics.includes(effect.metric)
    )
  ).slice(0, 5); // Top 5 suggestions
}
