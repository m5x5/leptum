// @ldo/ldo-based replacement for fromRdf.ts's extractGoal() — milestones,
// trackingConfig, and trackingData are nested blank nodes that never
// round-tripped through the flat Fact[] reader (extractGoal only reads
// flat top-level fields); this is the highest-value fix in the ldo migration.
import type { LdoDataset, LdSet } from '@ldo/ldo';
import type { Goal, GoalMilestone, DailyTrackingEntry } from '../remoteStorage';
import { GoalShapeType } from './_ldo/goal.shapeTypes';
import type { Goal as GoalLdo, Milestone } from './_ldo/goal.typings';
import { idFromUrl } from './fromRdf';

// @ldo/cli 1.0.0-alpha.51 types actionStatus as a single value on both Goal
// and Milestone, but the generated JSON-LD context marks the shared
// schema:actionStatus predicate `@isCollection: true` (the same generator
// bug affecting every IRI value-set enum — see taskShape.ts's TaskFixed) —
// at runtime it's actually an LdSet on both.
type GoalFixed = Omit<GoalLdo, 'actionStatus'> & { actionStatus?: LdSet<{ '@id': string }> };
type MilestoneFixed = Omit<Milestone, 'actionStatus'> & { actionStatus?: LdSet<{ '@id': string }> };

function actionStatusToStatus(iri: string | undefined): string | undefined {
  if (!iri) return undefined;
  if (iri.includes('CompletedActionStatus')) return 'completed';
  if (iri.includes('FailedActionStatus')) return 'archived';
  if (iri.includes('ActiveActionStatus')) return 'active';
  return undefined; // PotentialActionStatus (or unrecognized) — no confident mapping back
}

export function extractGoalFromDataset(dataset: LdoDataset, url: string): Goal | null {
  const g = dataset.usingType(GoalShapeType).fromSubject(url) as unknown as GoalFixed;
  if (!g.name) return null;

  const id = idFromUrl(url);
  const goal: Goal = {
    id,
    name: g.name,
    type: g.additionalType ? idFromUrl(g.additionalType['@id']) : '',
  };
  if (g.color) goal.color = g.color;
  if (g.description) goal.description = g.description;
  if (g.endTime) goal.targetDate = new Date(g.endTime).getTime();
  if (g.created) goal.createdAt = new Date(g.created).getTime();
  if (g.completedAt) goal.completedAt = new Date(g.completedAt).getTime();
  const statusIri = Array.from(g.actionStatus ?? [])[0]?.['@id'];
  const status = actionStatusToStatus(statusIri);
  if (status) goal.status = status;

  const milestones: GoalMilestone[] = Array.from(g.milestone ?? []).map((m, index) => {
    const mm = m as unknown as MilestoneFixed;
    const mStatusIri = Array.from(mm.actionStatus ?? [])[0]?.['@id'];
    const milestone: GoalMilestone = {
      id: `${id}-milestone-${index}`,
      name: mm.name ?? '',
      completed: mStatusIri?.includes('CompletedActionStatus') ?? false,
      order: mm.order ?? index,
    };
    if (mm.endTime) milestone.targetDate = new Date(mm.endTime).getTime();
    if (mm.completedAt) milestone.completedAt = new Date(mm.completedAt).getTime();
    return milestone;
  });
  if (milestones.length) goal.milestones = milestones;

  if (g.trackingConfig?.trackingType) {
    const tc = g.trackingConfig;
    const config: Goal['trackingConfig'] = {
      type: tc.trackingType as NonNullable<Goal['trackingConfig']>['type'],
      unit: tc.unit ?? '',
      icon: tc.icon ?? '',
    };
    if (tc.dailyTarget != null) config.dailyTarget = tc.dailyTarget;
    if (tc.maxPerDay != null) config.maxPerDay = tc.maxPerDay;
    if (tc.increments?.size) config.increments = Array.from(tc.increments);
    if (tc.options?.size) config.options = Array.from(tc.options);
    goal.trackingConfig = config;
  }

  const trackingEntries: DailyTrackingEntry[] = Array.from(g.trackingEntry ?? [])
    .filter((e) => e.date)
    .map((e) => {
      const entry: DailyTrackingEntry = { date: e.date! };
      if (e.value != null) entry.value = e.value;
      if (e.completed != null) entry.completed = e.completed;
      if (e.notes) entry.notes = e.notes;
      if (e.timestamp) entry.timestamp = new Date(e.timestamp).getTime();
      return entry;
    });
  if (trackingEntries.length) goal.trackingData = { entries: trackingEntries };

  return goal;
}
