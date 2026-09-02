// Photos are two resources per record: an RDF metadata resource (imageShape.ts)
// and a real binary resource holding the raw image bytes, referenced by IRI
// from the metadata's schema:contentUrl. No separate thumbnail resource is
// stored (see image.shex) — the UI renders from the full image.
import type { Session as SolidSessionInstance } from '@uvdsl/solid-oidc-client-browser';
import { getResolvedContainers } from './activeContainers';
import { photoToRdf, type ExportContext } from './transform';
import { listContainer } from './fromRdf';
import { fetchResourceCached, forgetResource, pruneResources } from './resourceCache';
import { extractPhotoAttachmentFromDataset } from './imageShape';
import { docToTurtle } from './toTurtle';
import type { PhotoAttachment } from '../remoteStorage';

async function metadataUrl(session: SolidSessionInstance, webId: string, id: string): Promise<string> {
  const containers = await getResolvedContainers(session, webId);
  return `${containers.images}${encodeURIComponent(id)}`;
}

function binaryUrl(containers: Record<string, string>, id: string): string {
  return `${containers.images}${encodeURIComponent(id)}.bin`;
}

export async function listPhotos(session: SolidSessionInstance, webId: string): Promise<PhotoAttachment[]> {
  const containers = await getResolvedContainers(session, webId);
  const urls = await listContainer(session, containers.images);
  pruneResources(webId, containers.images, urls);
  const photos = await Promise.all(
    urls.filter((url) => !url.endsWith('.bin')).map((url) =>
      fetchResourceCached(session, webId, url, extractPhotoAttachmentFromDataset, 'photo')
    )
  );
  return photos.filter((p): p is PhotoAttachment => p !== null);
}

export async function getPhotosForImpact(session: SolidSessionInstance, webId: string, impactId: string): Promise<PhotoAttachment[]> {
  const photos = await listPhotos(session, webId);
  return photos.filter((p) => p.impactId === impactId);
}

/** Uploads the raw image bytes as a real Solid binary resource. Returns its URL, for use as PhotoAttachment.fullImagePath. */
export async function saveFullImage(session: SolidSessionInstance, webId: string, photoId: string, data: ArrayBuffer, mimeType: string): Promise<string | null> {
  const containers = await getResolvedContainers(session, webId);
  const url = binaryUrl(containers, photoId);
  const res = await session.authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': mimeType },
    body: data,
  });
  return res.ok ? url : null;
}

export async function getFullImageBlob(session: SolidSessionInstance, url: string): Promise<Blob | null> {
  const res = await session.authFetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  return await res.blob();
}

/** Writes the RDF metadata resource — photo.fullImagePath must already point at a binary resource saved via saveFullImage(). */
export async function savePhotoMetadata(session: SolidSessionInstance, webId: string, photo: PhotoAttachment): Promise<void> {
  const containers = await getResolvedContainers(session, webId);
  const ctx: ExportContext = { containers };
  const { url, doc } = photoToRdf(ctx, photo, photo.fullImagePath);
  const res = await session.authFetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/turtle' },
    body: await docToTurtle(doc, url),
  });
  if (!res.ok) throw new Error(`Failed to save photo metadata to pod (${res.status})`);
  forgetResource(webId, url);
}

export async function deletePhoto(session: SolidSessionInstance, webId: string, id: string): Promise<void> {
  const containers = await getResolvedContainers(session, webId);
  const metaUrl = await metadataUrl(session, webId, id);
  forgetResource(webId, metaUrl);
  await Promise.all([
    session.authFetch(metaUrl, { method: 'DELETE' }),
    session.authFetch(binaryUrl(containers, id), { method: 'DELETE' }).catch(() => {}),
  ]);
}
