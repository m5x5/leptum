// @ldo/ldo-based replacement for fromRdf.ts's extractUserSettings().
import type { LdoDataset } from '@ldo/ldo';
import { normalizeExperimentIds } from '../experiments';
import type { UserSettings } from '../remoteStorage';
import { UserSettingsShapeType } from './_ldo/userSettings.shapeTypes';

const UI = 'http://www.w3.org/ns/ui#';

function timeToHour(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const match = /^(\d{2}):(\d{2})(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?$/.exec(value);
  if (!match) return undefined;
  return Number(match[1]) + Number(match[2]) / 60;
}

function colorSchemeToTheme(colorScheme: { '@id'?: string } | undefined): UserSettings['theme'] | undefined {
  switch (colorScheme?.['@id']) {
    case `${UI}LightColorScheme`:
    case 'LightColorScheme':
      return 'light';
    case `${UI}DarkColorScheme`:
    case 'DarkColorScheme':
      return 'dark';
    case `${UI}SystemColorScheme`:
    case 'SystemColorScheme':
      return 'system';
    default:
      return undefined;
  }
}

export function extractUserSettingsFromDataset(dataset: LdoDataset, url: string): UserSettings {
  const s = dataset.usingType(UserSettingsShapeType).fromSubject(url);
  const settings: UserSettings = {};
  const theme = colorSchemeToTheme(s.colorScheme);
  if (theme) settings.theme = theme;
  if (s.timeFormat) settings.timeFormat = s.timeFormat as UserSettings['timeFormat'];
  const wakingStartHour = timeToHour(s.wakingStartHour);
  const wakingEndHour = timeToHour(s.wakingEndHour);
  if (wakingStartHour != null) settings.wakingStartHour = wakingStartHour;
  if (wakingEndHour != null) settings.wakingEndHour = wakingEndHour;
  if (s.showKeyboardShortcuts != null) settings.showKeyboardShortcuts = s.showKeyboardShortcuts;
  const experiments = normalizeExperimentIds(Array.from(s.enabledExperiment ?? []));
  if (experiments.length > 0) settings.enabledExperiments = experiments;
  const books = Array.from(s.suggestContactsFrom ?? []).map((n) => n['@id']).filter(Boolean);
  const groups = Array.from(s.suggestContactsFromGroup ?? []).map((n) => n['@id']).filter(Boolean);
  if (books.length > 0) settings.suggestContactsFromAddressBooks = books;
  if (groups.length > 0) settings.suggestContactsFromGroups = groups;
  return settings;
}
