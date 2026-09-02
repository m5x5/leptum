import type { ShapeType } from "@ldo/ldo";
import { imageSchema } from "./image.schema";
import { imageContext } from "./image.context";
import type { PhotoAttachment } from "./image.typings";

/**
 * =============================================================================
 * LDO ShapeTypes image
 * =============================================================================
 */

/**
 * PhotoAttachment ShapeType
 */
export const PhotoAttachmentShapeType: ShapeType<PhotoAttachment> = {
  schema: imageSchema,
  shape: "https://mpeters.dev/ns/leptum#PhotoAttachmentShape",
  context: imageContext,
};
