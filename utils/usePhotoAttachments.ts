import { useCallback } from 'react';
import { defineCollection } from '../lib/query/defineCollection';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface PhotoAttachment {
  id: string;
  impactId: string;
  thumbnail: string; // Base64 encoded thumbnail
  fullImagePath?: string; // URL/path to full image resource
  mimeType: string;
  width?: number;
  height?: number;
  createdAt: number;
  caption?: string;
}

// Maximum dimensions for thumbnails
const THUMBNAIL_MAX_WIDTH = 200;
const THUMBNAIL_MAX_HEIGHT = 200;
const THUMBNAIL_QUALITY = 0.7;

/**
 * Generate a thumbnail from an image file
 * Returns base64 encoded thumbnail and image dimensions
 */
export async function generateThumbnail(
  file: File
): Promise<{ thumbnail: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate thumbnail dimensions while maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > THUMBNAIL_MAX_WIDTH) {
          height = (height * THUMBNAIL_MAX_WIDTH) / width;
          width = THUMBNAIL_MAX_WIDTH;
        }

        if (height > THUMBNAIL_MAX_HEIGHT) {
          width = (width * THUMBNAIL_MAX_HEIGHT) / height;
          height = THUMBNAIL_MAX_HEIGHT;
        }

        // Create canvas and draw scaled image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to base64
        const thumbnail = canvas.toDataURL('image/jpeg', THUMBNAIL_QUALITY);

        resolve({
          thumbnail,
          width: img.width,
          height: img.height,
        });
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Convert a File to base64 string
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const photosCollection = defineCollection<PhotoAttachment[]>(
  'photos',
  async () => {
    try {
      return await remoteStorageClient.getPhotos();
    } catch (error: unknown) {
      const err = error as { status?: number; missing?: boolean };
      // 404 is expected when the photos collection doesn't exist yet.
      if (err?.status === 404 || String(error).includes('404') || err?.missing) return [];
      throw error;
    }
  },
  { initial: [], refreshOn: ['photosUpdated'] }
);

// Module-level, stable — callbacks below need no extra deps.
const setPhotos = (updater: (prev: PhotoAttachment[]) => PhotoAttachment[]) => {
  photosCollection.markSelfWrite();
  photosCollection.set(updater);
};

const EMPTY: PhotoAttachment[] = [];

export function usePhotoAttachments() {
  const { data, isPending: loading } = photosCollection.useQuery();
  const photos = data ?? EMPTY;
  const loadPhotos = photosCollection.invalidate;

  /**
   * Add a photo attachment for an impact
   * Generates thumbnail and optionally stores full image
   */
  const addPhoto = useCallback(async (
    impactId: string,
    file: File,
    options?: { caption?: string; storeFullImage?: boolean }
  ): Promise<PhotoAttachment | null> => {
    let newPhoto: PhotoAttachment | null = null;
    
    try {
      // Generate thumbnail
      const { thumbnail, width, height } = await generateThumbnail(file);

      const photoId = `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      let fullImagePath: string | undefined;

      // Optionally store full image (for larger images, this can be skipped to save space)
      if (options?.storeFullImage) {
        const buffer = await file.arrayBuffer();
        fullImagePath = await remoteStorageClient.saveFullImage(photoId, buffer, file.type) || undefined;
      }

      newPhoto = {
        id: photoId,
        impactId,
        thumbnail,
        fullImagePath,
        mimeType: file.type,
        width,
        height,
        createdAt: Date.now(),
        caption: options?.caption,
      };

      try {
        await remoteStorageClient.addPhoto(newPhoto);
      } catch (addError) {
        console.error('Error adding photo via addPhoto:', addError);
        throw addError; // Re-throw to trigger retry logic
      }

      // Update local state
      setPhotos(prev => {
        const updated = [...prev, newPhoto!];
        return updated;
      });

      return newPhoto;
    } catch (error: unknown) {
      // If the single PUT failed (e.g. container just created), retry it once.
      if (newPhoto) {
        try {
          await remoteStorageClient.addPhoto(newPhoto);
          setPhotos(prev => [...prev, newPhoto!]);
          return newPhoto;
        } catch (retryError: unknown) {
          console.error('Failed to save photo after retry:', retryError);
          return null;
        }
      }
      console.error('Failed to add photo:', error);
      return null;
    }
  }, []);

  /**
   * Delete a photo attachment
   */
  const deletePhoto = useCallback(async (photoId: string) => {
    try {
      await remoteStorageClient.deletePhoto(photoId);
      setPhotos(prev => prev.filter(p => p.id !== photoId));
    } catch (error) {
      console.error('Failed to delete photo:', error);
    }
  }, []);

  /**
   * Delete all photos for an impact
   */
  const deletePhotosForImpact = useCallback(async (impactId: string) => {
    try {
      await remoteStorageClient.deletePhotosForImpact(impactId);
      setPhotos(prev => prev.filter(p => p.impactId !== impactId));
    } catch (error) {
      console.error('Failed to delete photos for impact:', error);
    }
  }, []);

  /**
   * Get photos for a specific impact
   */
  const getPhotosForImpact = useCallback((impactId: string): PhotoAttachment[] => {
    const filtered = photos.filter(p => p.impactId === impactId);
    return filtered;
  }, [photos]);

  /**
   * Update photo caption
   */
  const updatePhotoCaption = useCallback(async (photoId: string, caption: string) => {
    try {
      const existing = photosCollection.get().find(p => p.id === photoId);
      if (!existing) return;
      const updated = { ...existing, caption };
      setPhotos(prev => prev.map(p => (p.id === photoId ? updated : p)));
      await remoteStorageClient.updatePhoto(updated);
    } catch (error) {
      console.error('Failed to update photo caption:', error);
    }
  }, []);

  /**
   * Get full image data (if stored)
   */
  const getFullImage = useCallback(async (photo: PhotoAttachment): Promise<string | null> => {
    if (!photo.fullImagePath) {
      // If no full image stored, return the thumbnail
      return photo.thumbnail;
    }

    try {
      const blob = await remoteStorageClient.getFullImageBlob(photo.fullImagePath, photo.mimeType);
      if (!blob) return photo.thumbnail;
      return URL.createObjectURL(blob);
    } catch (error) {
      console.error('Failed to get full image:', error);
      return photo.thumbnail;
    }
  }, []);

  return {
    photos,
    loading,
    addPhoto,
    deletePhoto,
    deletePhotosForImpact,
    getPhotosForImpact,
    updatePhotoCaption,
    getFullImage,
    refreshPhotos: loadPhotos,
  };
}
