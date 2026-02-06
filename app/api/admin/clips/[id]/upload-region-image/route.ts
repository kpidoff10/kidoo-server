/**
 * POST /api/admin/clips/[id]/upload-region-image
 * Reçoit une image extraite côté client (même rendu que le navigateur) et l'upload sur R2.
 * Met à jour la BDD avec l'URL.
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { uploadClipFile } from '@/lib/r2';
import { FaceRegionKey } from '@kidoo/shared/prisma';

export const POST = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: clipId } = await params;
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const type = formData.get('type') as string;
      const frameIndexStr = formData.get('frameIndex') as string;
      const frameIndex = parseInt(frameIndexStr ?? '', 10);
      const regionKey = formData.get('regionKey') as string | null;
      const artifactId = formData.get('artifactId') as string | null;

      if (!file || !type || !Number.isFinite(frameIndex)) {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'file, type et frameIndex requis.',
        });
      }

      if (type === 'region') {
        if (!regionKey || !['leftEye', 'rightEye', 'mouth'].includes(regionKey)) {
          return createErrorResponse('VALIDATION_ERROR', 400, {
            message: 'regionKey requis (leftEye, rightEye, mouth).',
          });
        }
      } else if (type === 'artifact') {
        if (!artifactId) {
          return createErrorResponse('VALIDATION_ERROR', 400, {
            message: 'artifactId requis pour type=artifact.',
          });
        }
      } else {
        return createErrorResponse('VALIDATION_ERROR', 400, {
          message: 'type doit être "region" ou "artifact".',
        });
      }

      const buffer = Buffer.from(await file.arrayBuffer());
      const API_KEY_TO_REGION: Record<string, FaceRegionKey> = {
        leftEye: FaceRegionKey.LEFT_EYE,
        rightEye: FaceRegionKey.RIGHT_EYE,
        mouth: FaceRegionKey.MOUTH,
      };
      const regionKeyDb = regionKey ? API_KEY_TO_REGION[regionKey] : null;

      if (type === 'region' && regionKeyDb) {
        const fileName = `regions/frame-${frameIndex}-${regionKey}.png`;
        const baseUrl = await uploadClipFile(clipId, fileName, buffer, 'image/png');
        const imageUrl = `${baseUrl.split('?')[0]}?v=${Date.now()}`;

        await prisma.clipFaceRegion.updateMany({
          where: { clipId, frameIndex, regionKey: regionKeyDb },
          data: { imageUrl },
        });

        return createSuccessResponse({ imageUrl, frameIndex, regionKey });
      }

      if (type === 'artifact' && artifactId) {
        const artifact = await prisma.clipArtifact.findFirst({
          where: { id: artifactId, clipId },
        });
        if (!artifact) {
          return createErrorResponse('NOT_FOUND', 404, { message: 'Artefact introuvable.' });
        }
        const fileName = `artifacts/frame-${frameIndex}-${artifactId}.png`;
        const baseUrl = await uploadClipFile(clipId, fileName, buffer, 'image/png');
        const imageUrl = `${baseUrl.split('?')[0]}?v=${Date.now()}`;

        await prisma.clipArtifact.update({
          where: { id: artifactId },
          data: { imageUrl },
        });

        return createSuccessResponse({ imageUrl, frameIndex, artifactId });
      }

      return createErrorResponse('INTERNAL_ERROR', 500);
    } catch (error) {
      console.error('Erreur upload région:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
