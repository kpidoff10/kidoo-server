'use client';

/**
 * Hooks pour les firmwares (admin) avec React Query et optimistic updates
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { firmwareApi, type Firmware } from '../lib/firmwareApi';
import type { CreateFirmwareInput } from '@kidoo/shared';
import type { KidooModelId } from '@kidoo/shared';

const FIRMWARE_KEYS = {
  all: ['admin', 'firmwares'] as const,
  byModel: (model: string) => [...FIRMWARE_KEYS.all, model] as const,
};

/**
 * Liste des firmwares par modèle
 */
export function useFirmwares(model: KidooModelId) {
  return useQuery({
    queryKey: FIRMWARE_KEYS.byModel(model),
    queryFn: async () => {
      const res = await firmwareApi.listByModel(model);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    enabled: !!model,
  });
}

/**
 * Créer un firmware (optimistic)
 */
export function useCreateFirmware(model: KidooModelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateFirmwareInput) => {
      const res = await firmwareApi.create(input);
      if (!res.success) throw new Error(res.error);
      return res.data;
    },
    onMutate: async (newFirmware) => {
      await queryClient.cancelQueries({ queryKey: FIRMWARE_KEYS.byModel(model) });

      const previous = queryClient.getQueryData<Firmware[]>(FIRMWARE_KEYS.byModel(model));

      queryClient.setQueryData<Firmware[]>(FIRMWARE_KEYS.byModel(model), (old) => {
        const optimistic: Firmware = {
          id: `temp-${Date.now()}`,
          model: newFirmware.model,
          version: newFirmware.version,
          url: newFirmware.url,
          path: newFirmware.path,
          fileName: newFirmware.fileName,
          fileSize: newFirmware.fileSize,
          createdAt: new Date().toISOString(),
        };
        return old ? [optimistic, ...old] : [optimistic];
      });

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(FIRMWARE_KEYS.byModel(model), context.previous);
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData<Firmware[]>(FIRMWARE_KEYS.byModel(model), (old) => {
        if (!old) return [data];
        const withoutTemp = old.filter((f) => !f.id.startsWith('temp-'));
        return [data, ...withoutTemp];
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FIRMWARE_KEYS.byModel(model) });
    },
  });
}

/**
 * Supprimer un firmware (optimistic)
 */
export function useDeleteFirmware(model: KidooModelId) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await firmwareApi.delete(id);
      if (!res.success) throw new Error(res.error);
      return id;
    },
    onMutate: async (deletedId) => {
      await queryClient.cancelQueries({ queryKey: FIRMWARE_KEYS.byModel(model) });

      const previous = queryClient.getQueryData<Firmware[]>(FIRMWARE_KEYS.byModel(model));

      queryClient.setQueryData<Firmware[]>(FIRMWARE_KEYS.byModel(model), (old) =>
        old ? old.filter((f) => f.id !== deletedId) : []
      );

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous !== undefined) {
        queryClient.setQueryData(FIRMWARE_KEYS.byModel(model), context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: FIRMWARE_KEYS.byModel(model) });
    },
  });
}
