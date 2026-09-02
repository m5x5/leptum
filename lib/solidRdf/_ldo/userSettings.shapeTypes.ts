import type { ShapeType } from "@ldo/ldo";
import { userSettingsSchema } from "./userSettings.schema";
import { userSettingsContext } from "./userSettings.context";
import type { UserSettings } from "./userSettings.typings";

/**
 * =============================================================================
 * LDO ShapeTypes userSettings
 * =============================================================================
 */

/**
 * UserSettings ShapeType
 */
export const UserSettingsShapeType: ShapeType<UserSettings> = {
  schema: userSettingsSchema,
  shape: "https://mpeters.dev/ns/leptum#UserSettingsShape",
  context: userSettingsContext,
};
