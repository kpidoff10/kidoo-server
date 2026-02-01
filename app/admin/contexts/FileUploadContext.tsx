'use client';

/**
 * Provider pour les uploads de fichiers (Cloudflare R2)
 * Gère l'upload direct vers R2 avec URL signée.
 *
 * Note CORS : le bucket R2 doit autoriser l'origine de l'admin
 * (Cloudflare Dashboard > R2 > Bucket > Settings > CORS).
 */

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from 'react';
import { firmwareApi } from '../lib/firmwareApi';
import type { KidooModelId } from '@kidoo/shared';

export interface FirmwareUploadResult {
  url: string;
  path: string;
  fileName: string;
  fileSize: number;
}

interface FileUploadState {
  isUploading: boolean;
  progress: number; // 0-100
  error: string | null;
}

interface FileUploadContextType extends FileUploadState {
  uploadFirmware: (
    file: File,
    model: KidooModelId,
    version: string
  ) => Promise<FirmwareUploadResult>;
  reset: () => void;
}

const FileUploadContext = createContext<FileUploadContextType | undefined>(
  undefined
);

export function FileUploadProvider({ children }: { children: React.ReactNode }) {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setProgress(0);
    setIsUploading(false);
  }, []);

  const uploadFirmware = useCallback(
    async (
      file: File,
      model: KidooModelId,
      version: string
    ): Promise<FirmwareUploadResult> => {
      setError(null);
      setIsUploading(true);
      setProgress(0);

      try {
        // 1. Obtenir l'URL signée
        const urlRes = await firmwareApi.getUploadUrl({
          model,
          version,
          fileName: file.name,
          fileSize: file.size,
        });

        if (!urlRes.success) {
          throw new Error(urlRes.error);
        }

        const { uploadUrl, path, publicUrl } = urlRes.data;
        setProgress(20);

        // 2. Upload direct vers R2 (PUT)
        const xhr = new XMLHttpRequest();

        const uploadPromise = new Promise<void>((resolve, reject) => {
          xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
              const pct = 20 + Math.round((e.loaded / e.total) * 80);
              setProgress(pct);
            }
          });

          xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(100);
              resolve();
            } else {
              reject(new Error(`Upload échoué: ${xhr.status}`));
            }
          });

          xhr.addEventListener('error', () =>
            reject(new Error('Erreur réseau'))
          );
          xhr.addEventListener('abort', () =>
            reject(new Error('Upload annulé'))
          );

          xhr.open('PUT', uploadUrl);
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.send(file);
        });

        await uploadPromise;

        return {
          url: publicUrl,
          path,
          fileName: file.name,
          fileSize: file.size,
        };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Erreur inconnue';
        setError(msg);
        throw err;
      } finally {
        setIsUploading(false);
      }
    },
    []
  );

  const value: FileUploadContextType = {
    isUploading,
    progress,
    error,
    uploadFirmware,
    reset,
  };

  return (
    <FileUploadContext.Provider value={value}>
      {children}
    </FileUploadContext.Provider>
  );
}

export function useFileUpload(): FileUploadContextType {
  const ctx = useContext(FileUploadContext);
  if (!ctx) {
    throw new Error('useFileUpload must be used within FileUploadProvider');
  }
  return ctx;
}
