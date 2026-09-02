// @ldo/ldo-based reader for PhotoAttachment metadata resources. The actual
// image bytes live at a separate binary resource (schema:contentUrl) — see
// imageBackend.ts for the binary PUT/GET side of this.
import type { LdoDataset } from '@ldo/ldo';
import type { PhotoAttachment } from '../remoteStorage';
import { PhotoAttachmentShapeType } from './_ldo/image.shapeTypes';
import { idFromUrl } from './fromRdf';

export function extractPhotoAttachmentFromDataset(dataset: LdoDataset, url: string): PhotoAttachment | null {
  const p = dataset.usingType(PhotoAttachmentShapeType).fromSubject(url);
  if (!p.aboutImpact || !p.encodingFormat) return null;
  // No separate thumbnail resource is stored (see image.shex) — reuse the
  // full-image URL so existing `<img src={photo.thumbnail}>` call sites
  // still render something, at full resolution instead of a small preview.
  const photo: PhotoAttachment = {
    id: idFromUrl(url),
    impactId: idFromUrl(p.aboutImpact['@id']),
    thumbnail: p.contentUrl?.['@id'] ?? '',
    mimeType: p.encodingFormat,
    createdAt: p.created ? new Date(p.created).getTime() : Date.now(),
  };
  if (p.contentUrl) photo.fullImagePath = p.contentUrl['@id'];
  if (p.width != null) photo.width = p.width;
  if (p.height != null) photo.height = p.height;
  if (p.caption) photo.caption = p.caption;
  return photo;
}
