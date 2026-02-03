/**
 * POST /api/admin/firmware/upload-zip
 * Reçoit un .zip contenant part0.bin, part1.bin, ... (max 2 Mo par part).
 * Décompresse, uploade chaque part vers R2, crée ou met à jour le firmware (partCount).
 */

import AdmZip from 'adm-zip';
import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createSuccessResponse, createErrorResponse } from '@/lib/api-response';
import { FirmwareErrors } from '../errors';
import { isKidooModelId } from '@kidoo/shared';
import type { KidooModel } from '@kidoo/shared/prisma';
import {
  uploadFirmwarePart,
  getFirmwarePartPath,
  getFirmwarePublicUrl,
  deleteFirmwareFile,
} from '@/lib/r2';

const PART_NAME_REGEX = /^part(\d+)\.bin$/;

export const POST = withAdminAuth(async (request: AdminAuthenticatedRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const model = formData.get('model') as string | null;
    const version = (formData.get('version') as string | null)?.trim();
    const changelog = (formData.get('changelog') as string | null)?.trim() || null;

    if (!file || file.size === 0) {
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: 'Fichier .zip requis',
      });
    }
    if (!model || !isKidooModelId(model)) {
      return createErrorResponse(FirmwareErrors.MODEL_INVALID, {
        message: 'Paramètre model requis et doit être un modèle valide (basic, dream, etc.)',
      });
    }
    if (!version) {
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: 'Paramètre version requis',
      });
    }
    if (!/^[\d.]+(-[a-zA-Z0-9.]+)?$/.test(version)) {
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: 'Format version invalide (ex: 1.0.0)',
      });
    }

    const buf = Buffer.from(await file.arrayBuffer());
    const zip = new AdmZip(buf);
    type ZipEntry = {
      isDirectory: boolean;
      entryName: string;
      getData: () => Buffer | Uint8Array;
    };

    const entries = (zip.getEntries() as ZipEntry[]).filter((entry) => !entry.isDirectory);

    const parts: { index: number; data: Buffer }[] = [];
    for (const entry of entries) {
      const match = entry.entryName.replace(/^[^/]*\//, '').match(PART_NAME_REGEX);
      if (!match) continue;
      const index = parseInt(match[1], 10);
      const data = entry.getData();
      parts.push({ index, data: Buffer.isBuffer(data) ? data : Buffer.from(data) });
    }
    parts.sort((a, b) => a.index - b.index);

    if (parts.length === 0) {
      return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
        message: 'Le zip doit contenir part0.bin, part1.bin, ... à la racine',
      });
    }
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].index !== i) {
        return createErrorResponse(FirmwareErrors.VALIDATION_ERROR, {
          message: `Parts attendues: part0.bin à part${parts.length - 1}.bin (manque part${i}.bin)`,
        });
      }
    }

    const partCount = parts.length;
    let totalSize = 0;
    for (const p of parts) {
      totalSize += p.data.length;
    }

    const existing = await prisma.firmware.findUnique({
      where: { model_version: { model: model as KidooModel, version } },
    });

    if (existing && existing.partCount > 1) {
      for (let i = 0; i < existing.partCount; i++) {
        const path = getFirmwarePartPath(model, version, i);
        try {
          await deleteFirmwareFile(path);
        } catch (err) {
          console.warn('[Firmware upload-zip] Erreur suppression part R2:', err);
        }
      }
    } else if (existing) {
      try {
        await deleteFirmwareFile(existing.path);
      } catch (err) {
        console.warn('[Firmware upload-zip] Erreur suppression fichier R2:', err);
      }
    }

    for (let i = 0; i < parts.length; i++) {
      await uploadFirmwarePart(model, version, i, parts[i].data);
    }

    const path0 = getFirmwarePartPath(model, version, 0);
    const publicUrl = getFirmwarePublicUrl(path0);

    const data = {
      model: model as KidooModel,
      version,
      url: publicUrl,
      path: path0,
      fileName: 'part0.bin',
      fileSize: totalSize,
      partCount,
      changelog,
    };

    if (existing) {
      const firmware = await prisma.firmware.update({
        where: { id: existing.id },
        data,
      });
      return createSuccessResponse(
        { ...firmware, createdAt: firmware.createdAt.toISOString() },
        { message: `Firmware mis à jour (${partCount} part(s))` }
      );
    }

    const firmware = await prisma.firmware.create({
      data,
    });
    return createSuccessResponse(
      { ...firmware, createdAt: firmware.createdAt.toISOString() },
      { message: `Firmware créé (${partCount} part(s))`, status: 201 }
    );
  } catch (error) {
    console.error('Erreur upload-zip firmware:', error);
    return createErrorResponse(FirmwareErrors.INTERNAL_ERROR, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
});
