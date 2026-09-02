import type { ShapeType } from "@ldo/ldo";
import { activityWatchDataSchema } from "./activityWatchData.schema";
import { activityWatchDataContext } from "./activityWatchData.context";
import type {
  ActivityWatchData,
  AWEvent,
  BucketMetadata,
} from "./activityWatchData.typings";

/**
 * =============================================================================
 * LDO ShapeTypes activityWatchData
 * =============================================================================
 */

/**
 * ActivityWatchData ShapeType
 */
export const ActivityWatchDataShapeType: ShapeType<ActivityWatchData> = {
  schema: activityWatchDataSchema,
  shape: "https://mpeters.dev/ns/leptum#ActivityWatchDataShape",
  context: activityWatchDataContext,
};

/**
 * AWEvent ShapeType
 */
export const AWEventShapeType: ShapeType<AWEvent> = {
  schema: activityWatchDataSchema,
  shape: "https://mpeters.dev/ns/leptum#AWEventShape",
  context: activityWatchDataContext,
};

/**
 * BucketMetadata ShapeType
 */
export const BucketMetadataShapeType: ShapeType<BucketMetadata> = {
  schema: activityWatchDataSchema,
  shape: "https://mpeters.dev/ns/leptum#BucketMetadataShape",
  context: activityWatchDataContext,
};
