import { createSingletonBackend } from './singletonBackend';
import { userSettingsToRdf } from './transform';
import { extractUserSettingsFromDataset } from './userSettingsShape';
import type { UserSettings } from '../remoteStorage';

export const userSettingsBackend = createSingletonBackend<UserSettings>({
  containerKey: 'preferences',
  resourceId: 'leptum',
  toRdf: userSettingsToRdf,
  extract: extractUserSettingsFromDataset,
});
