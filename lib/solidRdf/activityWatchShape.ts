// @ldo/ldo-based reader for the ActivityWatchData singleton — no prior RS
// reader to replace here (see activityWatchData.shex); this is a new
// backend built directly from the RS schema.
import type { LdoDataset } from '@ldo/ldo';
import type { ActivityWatchData, ProcessedAWEvent, BucketMetadata, EventData } from '../../activity-watch.d';
import { ActivityWatchDataShapeType } from './_ldo/activityWatchData.shapeTypes';

function extractEventData(e: {
  status?: string; file?: string; project?: string; language?: string; projectPath?: string;
  editor?: string; editorVersion?: string; eventType?: string; url?: string; title?: string;
  audible?: boolean; incognito?: boolean; tabCount?: number; app?: string;
}): EventData {
  const data: EventData = {};
  if (e.status) data.status = e.status as EventData['status'];
  if (e.file) data.file = e.file;
  if (e.project) data.project = e.project;
  if (e.language) data.language = e.language;
  if (e.projectPath) data.projectPath = e.projectPath;
  if (e.editor) data.editor = e.editor;
  if (e.editorVersion) data.editorVersion = e.editorVersion;
  if (e.eventType) data.eventType = e.eventType;
  if (e.url) data.url = e.url;
  if (e.title) data.title = e.title;
  if (e.audible != null) data.audible = e.audible;
  if (e.incognito != null) data.incognito = e.incognito;
  if (e.tabCount != null) data.tabCount = e.tabCount;
  if (e.app) data.app = e.app;
  return data;
}

export function extractActivityWatchDataFromDataset(dataset: LdoDataset, url: string): ActivityWatchData | null {
  const aw = dataset.usingType(ActivityWatchDataShapeType).fromSubject(url);
  if (!aw.importedAt) return null;

  const events: ProcessedAWEvent[] = Array.from(aw.event ?? [])
    .filter((e) => e.id && e.bucketId && e.bucketType && e.timestamp)
    .map((e) => ({
      id: e.id!,
      bucketId: e.bucketId!,
      bucketType: e.bucketType!,
      timestamp: new Date(e.timestamp!).getTime(),
      duration: e.duration ?? 0,
      displayName: e.displayName ?? '',
      eventData: extractEventData(e),
      color: e.color ?? '#888888',
      ...(e.isHidden != null ? { isHidden: e.isHidden } : {}),
    }));

  const buckets: BucketMetadata[] = Array.from(aw.bucket ?? [])
    .filter((b) => b.id && b.bucketType)
    .map((b) => ({
      id: b.id!,
      type: b.bucketType!,
      eventCount: b.eventCount ?? 0,
      dateRange: {
        start: b.rangeStart ? new Date(b.rangeStart).getTime() : 0,
        end: b.rangeEnd ? new Date(b.rangeEnd).getTime() : 0,
      },
      isVisible: b.isVisible ?? true,
    }));

  return { events, importedAt: new Date(aw.importedAt).getTime(), buckets };
}
