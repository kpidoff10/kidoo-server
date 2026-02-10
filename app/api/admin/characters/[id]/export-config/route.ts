/**
 * GET /api/admin/characters/[id]/export-config - Export config.json for ESP32
 *
 * Génère un fichier config.json contenant toutes les émotions/clips prêtes pour l'ESP32.
 * Filtre uniquement les EmotionVideos avec status='READY' et qui ont un index (.idx).
 */

import { prisma } from '@/lib/prisma';
import { withAdminAuth, AdminAuthenticatedRequest } from '@/lib/withAdminAuth';
import { createErrorResponse } from '@/lib/api-response';
import { NextResponse } from 'next/server';

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

export const GET = withAdminAuth(
  async (_request: AdminAuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: characterId } = await params;

      // Vérifier que le personnage existe
      const character = await prisma.character.findUnique({ where: { id: characterId } });
      if (!character) {
        return createErrorResponse('CHARACTER_NOT_FOUND', 404);
      }

      // Récupérer tous les clips du personnage avec leurs EmotionVideos
      const clips = await prisma.clip.findMany({
        where: { characterId },
        include: {
          emotion: true,
          emotionVideos: {
            where: {
              status: 'READY',
              idxUrl: { not: null },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
        orderBy: [{ emotion: { key: 'asc' } }, { createdAt: 'desc' }],
      });

      // Filtrer les clips qui ont au moins un EmotionVideo valide
      const clipsWithVideos = clips.filter(clip => clip.emotionVideos.length > 0);

      // Grouper par émotion (key + variant)
      // Note: Chaque EmotionVideo a maintenant son propre trigger/variant (hérité du clip source)
      const emotionMap = new Map<string, {
        emotionId: string;
        key: string;
        trigger?: string;
        variant?: number;
        videos: typeof clips[0]['emotionVideos'];
      }>();

      for (const clip of clipsWithVideos) {
        const key = clip.emotion.key;

        // Traiter chaque EmotionVideo individuellement (car chaque vidéo peut avoir un trigger/variant différent)
        for (const video of clip.emotionVideos) {
          // Créer une clé unique par émotion + variant
          const mapKey = `${key}_v${video.variant || 1}`;

          if (!emotionMap.has(mapKey)) {
            emotionMap.set(mapKey, {
              emotionId: clip.emotionId,
              key,
              trigger: video.trigger || 'manual',
              variant: video.variant || 1,
              videos: [],
            });
          }

          const emotion = emotionMap.get(mapKey)!;
          emotion.videos.push(video);
        }
      }

      // Formater pour l'export ESP32
      const exportData: EmotionExport[] = [];

      for (const [_key, emotion] of emotionMap) {
        const emotionVideos: EmotionVideoExport[] = emotion.videos.map(video => {
          // Parser les timelines JSON
          const introTimeline = video.introTimeline as TimelineFrame[];
          const loopTimeline = video.loopTimeline as TimelineFrame[];
          const exitTimeline = video.exitTimeline as TimelineFrame[];

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
      }

      // Trier par key puis variant pour avoir un ordre cohérent
      exportData.sort((a, b) => {
        const keyCompare = a.key.localeCompare(b.key);
        if (keyCompare !== 0) return keyCompare;
        return (a.variant || 1) - (b.variant || 1);
      });

      // Retourner le JSON avec les bons headers pour téléchargement
      return new NextResponse(JSON.stringify(exportData, null, 2), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="config-${character.name || characterId}.json"`,
        },
      });
    } catch (error) {
      console.error('Erreur lors de l\'export de la configuration:', error);
      return createErrorResponse('INTERNAL_ERROR', 500, {
        details: error instanceof Error ? error.message : undefined,
      });
    }
  }
);
