/**
 * GET /api/kidoos/emotions-sync?characterId=xxx&since=ISO8601
 *
 * Route publique pour que l'ESP32 (ou un outil de sync) récupère la liste des émotions
 * et les URLs des fichiers à télécharger (config + video.mjpeg + video.idx).
 *
 * - characterId: requis.
 * - since: optionnel. Si fourni (date ISO8601), la config renvoyée reste COMPLÈTE (toutes
 *   les émotions du personnage), mais `files` ne contient que les médias modifiés après
 *   cette date (à télécharger). Le client écrit toujours la config complète et ne télécharge
 *   que les fichiers listés.
 * Réponse: { characterId, config, files, syncedAt } (syncedAt = date à stocker pour le prochain since).
 */

import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createErrorResponse, createSuccessResponse } from '@/lib/api-response';

interface TimelineFrame {
  sourceFrameIndex: number;
  actions?: Array<{
    type: string;
    effect?: string;
    color?: string;
  }>;
}

interface PhaseData {
  frames: number;
  timeline: TimelineFrame[];
}

interface EmotionVideoExport {
  emotion_videoId: string;
  fps: number;
  width: number;
  height: number;
  totalFrames: number;
  durationS: number;
  phases: {
    intro: PhaseData;
    loop: PhaseData;
    exit: PhaseData;
  };
}

interface EmotionExport {
  key: string;
  trigger?: string;
  variant?: number;
  emotionId: string;
  emotion_videos: EmotionVideoExport[];
}

interface SyncFileEntry {
  key: string;
  variant: number;
  emotionVideoId: string;
  mjpegUrl: string | null;
  idxUrl: string | null;
  /** Chemin sur la SD ESP32 pour video.mjpeg */
  localPathMjpeg: string;
  /** Chemin sur la SD ESP32 pour video.idx */
  localPathIdx: string;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const characterId = searchParams.get('characterId');

    if (!characterId) {
      return createErrorResponse('BAD_REQUEST', 400, {
        message: 'Paramètre characterId requis',
      });
    }

    const character = await prisma.character.findUnique({ where: { id: characterId } });
    if (!character) {
      return createErrorResponse('CHARACTER_NOT_FOUND', 404);
    }

    const sinceParam = searchParams.get('since');
    let sinceDate: Date | null = null;
    if (sinceParam && sinceParam.trim()) {
      sinceDate = new Date(sinceParam.trim());
      if (Number.isNaN(sinceDate.getTime())) sinceDate = null;
    }

    // Toujours récupérer tous les clips du personnage pour la config complète
    const clips = await prisma.clip.findMany({
      where: { characterId },
      include: {
        emotion: true,
        emotionVideos: {
          where: {
            status: 'READY',
            idxUrl: { not: null },
            binUrl: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: [{ emotion: { key: 'asc' } }, { createdAt: 'desc' }],
    });

    const clipsWithVideos = clips.filter(clip => clip.emotionVideos.length > 0);

    const emotionMap = new Map<string, {
      emotionId: string;
      key: string;
      trigger?: string;
      variant?: number;
      videos: typeof clips[0]['emotionVideos'];
    }>();

    const EATING_KEYS = ['eating_started', 'eating_in_progress', 'eating_finished'];
    const normalizeEatingKey = (k: string) => (EATING_KEYS.includes(k) ? 'eating' : k);
    const normalizeEatingTrigger = (t: string | null) =>
      (t && EATING_KEYS.includes(t) ? 'eating' : t) ?? 'manual';

    for (const clip of clipsWithVideos) {
      const key = clip.emotion.key;
      const normalizedKey = normalizeEatingKey(key);
      const normalizedTrigger = normalizeEatingTrigger(clip.trigger);
      for (const video of clip.emotionVideos) {
        const mapKey = `${normalizedKey}_v${clip.variant ?? 1}`;
        if (!emotionMap.has(mapKey)) {
          emotionMap.set(mapKey, {
            emotionId: clip.emotionId,
            key: normalizedKey,
            trigger: normalizedTrigger,
            variant: clip.variant ?? 1,
            videos: [],
          });
        }
        emotionMap.get(mapKey)!.videos.push(video);
      }
    }

    const exportData: EmotionExport[] = [];
    const files: SyncFileEntry[] = [];

    for (const [_mapKey, emotion] of emotionMap) {
      const emotionVideos: EmotionVideoExport[] = emotion.videos.map(video => {
        const introTimeline = (video.introTimeline as unknown) as TimelineFrame[];
        const loopTimeline = (video.loopTimeline as unknown) as TimelineFrame[];
        const exitTimeline = (video.exitTimeline as unknown) as TimelineFrame[];

        return {
          emotion_videoId: video.id,
          fps: video.fps,
          width: video.width,
          height: video.height,
          totalFrames: video.totalFrames || 0,
          durationS: video.durationS || 0,
          phases: {
            intro: {
              frames: introTimeline.length,
              timeline: introTimeline,
            },
            loop: {
              frames: loopTimeline.length,
              timeline: loopTimeline,
            },
            exit: {
              frames: exitTimeline.length,
              timeline: exitTimeline,
            },
          },
        };
      });

      exportData.push({
        key: emotion.key,
        trigger: emotion.trigger,
        variant: emotion.variant,
        emotionId: emotion.emotionId,
        emotion_videos: emotionVideos,
      });

      for (const video of emotion.videos) {
        // En sync incrémental (since), ne lister que les médias modifiés après since
        if (sinceDate && video.updatedAt <= sinceDate) continue;
        const basePath = `/characters/${characterId}/emotions/${emotion.key}/${video.id}`;
        files.push({
          key: emotion.key,
          variant: emotion.variant || 1,
          emotionVideoId: video.id,
          mjpegUrl: video.binUrl,
          idxUrl: video.idxUrl,
          localPathMjpeg: `${basePath}/video.mjpeg`,
          localPathIdx: `${basePath}/video.idx`,
        });
      }
    }

    exportData.sort((a, b) => {
      const keyCompare = a.key.localeCompare(b.key);
      if (keyCompare !== 0) return keyCompare;
      return (a.variant || 1) - (b.variant || 1);
    });

    const syncedAt = new Date().toISOString();

    return createSuccessResponse({
      characterId,
      config: exportData,
      files,
      syncedAt,
    });
  } catch (error) {
    console.error('Erreur lors de la récupération du sync émotions:', error);
    return createErrorResponse('INTERNAL_ERROR', 500, {
      details: error instanceof Error ? error.message : undefined,
    });
  }
}
