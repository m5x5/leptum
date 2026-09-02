// @ldo/ldo-based replacement for fromRdf.ts's extractEventResource() family.
// LifeEvent and Impact share the 'events' container (both schema:Event) —
// disambiguated the same way extractEventResource() does today:
// schema:startDate holding a bare YYYY-MM-DD date (not a full datetime)
// means LifeEvent, not Impact.
import type { LdoDataset } from '@ldo/ldo';
import type { LifeEvent, Impact } from '../remoteStorage';
import { EventShapeType } from './_ldo/event.shapeTypes';
import { idFromUrl } from './fromRdf';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export function extractLifeEventFromDataset(dataset: LdoDataset, url: string): LifeEvent | null {
  const event = dataset.usingType(EventShapeType).fromSubject(url);
  if (!event.name || !event.startDate || !DATE_ONLY.test(event.startDate)) return null;
  return {
    id: idFromUrl(url),
    label: event.name,
    startWeek: event.startDate,
    endWeek: event.endDate ?? event.startDate,
    color: event.color ?? '#3b82f6',
    createdAt: event.created ? new Date(event.created).getTime() : Date.now(),
  };
}

export function extractImpactFromDataset(dataset: LdoDataset, url: string): Impact | null {
  const event = dataset.usingType(EventShapeType).fromSubject(url);
  if (!event.name) return null;
  if (event.startDate && DATE_ONLY.test(event.startDate)) return null; // LifeEvent-shaped, not an Impact

  const impact: Impact = {
    id: idFromUrl(url),
    activity: event.name,
    date: event.startDate ? new Date(event.startDate).getTime() : Date.now(),
  };
  if (event.endDate) impact.endTime = new Date(event.endDate).getTime();
  if (event.description) impact.notes = event.description;
  if (event.url) impact.sourceUrl = event.url;
  if (event.about) impact.goalId = idFromUrl(event.about['@id']);
  const photoRefs = Array.from(event.image ?? []);
  if (photoRefs.length) impact.photoIds = photoRefs.map((ref) => idFromUrl(ref['@id']));
  if (event.allDay != null) impact.allDay = event.allDay;
  if (event.dismissed != null) impact.dismissed = event.dismissed;
  if (event.requiresOnlineTime != null) impact.requiresOnlineTime = event.requiresOnlineTime;
  if (event.stress != null) impact.stress = event.stress;
  if (event.fulfillment != null) impact.fulfillment = event.fulfillment;
  if (event.motivation != null) impact.motivation = event.motivation;
  if (event.cleanliness != null) impact.cleanliness = event.cleanliness;
  if (event.happiness != null) impact.happiness = event.happiness;
  if (event.confidence != null) impact.confidence = event.confidence;
  if (event.energy != null) impact.energy = event.energy;
  if (event.focus != null) impact.focus = event.focus;
  if (event.shame != null) impact.shame = event.shame;
  if (event.guilt != null) impact.guilt = event.guilt;
  return impact;
}
