// @ldo/ldo-based replacement for fromRdf.ts's extractInsight() — the
// affectedMetric array of blank nodes now actually round-trips (see
// insight.shex), fixing extractInsight's hardcoded affectedMetrics: [].
import type { LdoDataset } from '@ldo/ldo';
import type { Insight, AffectedMetric } from '../remoteStorage';
import { InsightShapeType } from './_ldo/insight.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractInsightFromDataset(dataset: LdoDataset, url: string): Insight | null {
  const i = dataset.usingType(InsightShapeType).fromSubject(url);
  if (!i.name) return null;
  const affectedMetrics: AffectedMetric[] = Array.from(i.affectedMetric ?? [])
    .filter((m) => m.metric && m.effect)
    .map((m) => ({ metric: m.metric!, effect: m.effect as AffectedMetric['effect'] }));
  const insight: Insight = {
    id: idFromUrl(url),
    name: i.name,
    affectedMetrics,
    createdAt: i.created ? new Date(i.created).getTime() : Date.now(),
  };
  if (i.description) insight.notes = i.description;
  if (i.category) insight.category = i.category;
  return insight;
}
