import { useState, useEffect, useCallback } from 'react';
import { remoteStorageClient } from '../lib/remoteStorage';

export interface PhotoAttachment {
  id: string;
  impactId: string;
  thumbnail: string; // Base64 encoded thumbnail
  fullImagePath?: string; // Path to full image in RemoteStorage
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

export function usePhotoAttachments() {
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();

    // Listen for changes from RemoteStorage
    const handleChange = (event: any) => {
      if (event.relativePath === 'photos' || event.relativePath.startsWith('photo-images/')) {
        loadPhotos();
      }
    };

    remoteStorageClient.onChange(handleChange);

    return () => {
      // Note: RemoteStorage doesn't have a direct off method, but the handler will be cleaned up
    };
  }, []);

  const loadPhotos = async () => {
    try {
      const loadedPhotos = await remoteStorageClient.getPhotos();
      setPhotos(loadedPhotos);
    } catch (error: any) {
      // 404 errors are expected when photos collection doesn't exist yet
      if (!(error?.status === 404 || error?.toString?.().includes('404') || error?.missing)) {
        console.error('Failed to load photos:', error);
      } else {
        console.warn('Photos collection does not exist yet (404 - expected)');
        setPhotos([]); // Ensure we set empty array on 404
      }
    } finally {
      setLoading(false);
    }
  };

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
        const fullBase64 = await fileToBase64(file);
        fullImagePath = await remoteStorageClient.saveFullImage(photoId, fullBase64, file.type) || undefined;
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
    } catch (error: any) {
      // If addPhoto failed, try saving directly (handles 404 and other cases)
      if (newPhoto) {
        try {
          // Get existing photos and merge
          const existingPhotos = await remoteStorageClient.getPhotos();
          const allPhotos = [...existingPhotos, newPhoto];
          await remoteStorageClient.savePhotos(allPhotos);
          setPhotos(prev => [...prev, newPhoto!]);
          return newPhoto;
        } catch (retryError: any) {
          // Only log if it's not a 404 (404s are expected when creating new collection)
          if (!(retryError?.status === 404 || retryError?.toString?.().includes('404') || retryError?.missing)) {
            console.error('Failed to save photos after retry:', retryError);
          }
          // Still return null if retry failed
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
      const updatedPhotos = photos.map(p =>
        p.id === photoId ? { ...p, caption } : p
      );
      await remoteStorageClient.savePhotos(updatedPhotos);
      setPhotos(updatedPhotos);
    } catch (error) {
      console.error('Failed to update photo caption:', error);
    }
  }, [photos]);

  /**
   * Get full image data (if stored)
   */
  const getFullImage = useCallback(async (photo: PhotoAttachment): Promise<string | null> => {
    if (!photo.fullImagePath) {
      // If no full image stored, return the thumbnail
      return photo.thumbnail;
    }

    try {
      const file = await remoteStorageClient.getFullImage(photo.fullImagePath);
      return file?.data || photo.thumbnail;
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
