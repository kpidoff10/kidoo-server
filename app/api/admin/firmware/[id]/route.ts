/**
 * DELETE /api/admin/firmware/[id]
 * Supprime un firmware (admin uniquement)
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from '../errors';
import { deleteFirmwareFile } from '@/lib/r2';

export const DELETE = withAdminAuth(
  async (request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await params;

      const firmware = await prisma.firmware.findUnique({
        where: { id },
      });

      if (!firmware) {
        return createErrorResponse(FirmwareErrors.NOT_FOUND);
      }

      try {
        await deleteFirmwareFile(firmware.path);
      } catch (err) {
        console.warn('[Firmware] Erreur suppression fichier R2:', err);
      }

      await prisma.firmware.delete({
        where: { id },
      });

      return createSuccessResponse(
        { id },
        {
          message: 'Firmware supprimé',
        }
      );
    } catch (error) {
      console.error('Erreur lors de la suppression du firmware:', error);
      return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
