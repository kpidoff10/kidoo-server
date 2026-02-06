'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { CharacterClipDetail, FaceRegions, ArtifactRegion } from '../../../../../../lib/charactersApi';
import type { TimelineFrame } from '../../../../../../types/emotion-video';
import { PreviewPanel } from './components/PreviewPanel';
import { TimelineBar } from './components/TimelineBar';
import { FramesDialog } from './components/FramesDialog';
import { CompositeFrameDialog } from './components/CompositeFrameDialog';
import type { TimelineRegion, TimelineArtifact } from '../../../../../../types/emotion-video';
import {
  useEmotionVideosByClip,
  useCreateEmotionVideo,
  useUpdateEmotionVideo,
  useGenerateEmotionVideo,
} from '../../../../../../hooks/useEmotionVideos';

const MAX_DURATION_S = 6;
const DEFAULT_FPS = 10;
const AUTO_SAVE_DELAY_MS = 2000; // 2 secondes de debounce

export interface ClipVideoCreationProps {
  clip: CharacterClipDetail;
}

export function ClipVideoCreation({ clip }: ClipVideoCreationProps) {
  const fps = clip.fps ?? DEFAULT_FPS;
  const totalFrames = useMemo(
    () =>
      Math.max(
        1,
        clip.frames ?? (clip.durationS ? Math.ceil(clip.durationS * fps) : 1)
      ),
    [clip.frames, clip.durationS, fps]
  );

  const regionsByFrame = useMemo(() => {
    const out: Record<number, FaceRegions> = {};
    if (clip.faceRegionsByFrame) {
      for (const [k, v] of Object.entries(clip.faceRegionsByFrame)) {
        const i = parseInt(k, 10);
        if (!Number.isNaN(i) && v) out[i] = v;
      }
    }
    return out;
  }, [clip.faceRegionsByFrame]);

  const artifactsByFrame = useMemo(() => {
    const out: Record<number, ArtifactRegion[]> = {};
    if (clip.artifactsByFrame) {
      for (const [k, v] of Object.entries(clip.artifactsByFrame)) {
        const i = parseInt(k, 10);
        if (!Number.isNaN(i) && Array.isArray(v)) out[i] = v;
      }
    }
    return out;
  }, [clip.artifactsByFrame]);

  const maxFrames = Math.floor(MAX_DURATION_S * fps);

  // Charger les EmotionVideos existantes pour ce clip
  const { data: emotionVideos, isLoading: isLoadingEmotionVideos } = useEmotionVideosByClip(clip.id);

  // Trouver l'EmotionVideo DRAFT pour cette émotion (ou la première disponible)
  const existingDraft = useMemo(() => {
    if (!emotionVideos?.length) return null;
    // Chercher d'abord un draft pour cette émotion
    const draft = emotionVideos.find(
      (ev) => ev.emotionId === clip.emotionId && ev.status === 'DRAFT'
    );
    if (draft) return draft;
    // Sinon prendre le premier draft disponible
    return emotionVideos.find((ev) => ev.status === 'DRAFT') ?? null;
  }, [emotionVideos, clip.emotionId]);

  const [emotionVideoId, setEmotionVideoId] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // 3 Timelines séparées (intro, loop, exit)
  const [introTimeline, setIntroTimeline] = useState<TimelineFrame[]>(() => {
    // Initialiser avec toutes les frames du clip dans l'intro
    const initialIntro: TimelineFrame[] = [];
    const framesToAdd = Math.min(totalFrames, maxFrames);

    for (let i = 0; i < framesToAdd; i++) {
      initialIntro.push({
        frameIndex: i,
        type: 'full',
        sourceFrameIndex: i,
      });
    }

    return initialIntro;
  });

  const [loopTimeline, setLoopTimeline] = useState<TimelineFrame[]>([]);

  const [exitTimeline, setExitTimeline] = useState<TimelineFrame[]>([]);

  const [framesDialogOpen, setFramesDialogOpen] = useState(false);
  const [compositeFrameDialogOpen, setCompositeFrameDialogOpen] = useState(false);
  const [targetPhase, setTargetPhase] = useState<'intro' | 'loop' | 'exit'>('loop');
  const [currentPreviewFrame, setCurrentPreviewFrame] = useState(0);
  const [draggedFrameIndex, setDraggedFrameIndex] = useState<number | null>(null);
  const [lastCompositeFrame, setLastCompositeFrame] = useState<{
    regions: {
      leftEye?: TimelineRegion;
      rightEye?: TimelineRegion;
      mouth?: TimelineRegion;
    };
    artifacts: TimelineArtifact[];
  } | null>(null);
  const [editingFrameGlobalIndex, setEditingFrameGlobalIndex] = useState<number | null>(null);

  // Mutations pour créer/mettre à jour l'EmotionVideo
  const createEmotionVideoMutation = useCreateEmotionVideo(clip.id);
  const updateEmotionVideoMutation = useUpdateEmotionVideo(
    emotionVideoId ?? '',
    clip.id
  );
  const generateEmotionVideoMutation = useGenerateEmotionVideo(
    emotionVideoId ?? '',
    clip.id
  );

  // Ref pour le debounce de l'auto-save
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Initialiser les 3 timelines depuis la DB si un draft existe
  useEffect(() => {
    if (isInitialized) return;

    // Attendre que le chargement soit terminé avant d'initialiser
    if (isLoadingEmotionVideos) return;

    if (existingDraft) {
      setEmotionVideoId(existingDraft.id);
      // Charger les 3 timelines depuis la DB
      if (existingDraft.introTimeline && Array.isArray(existingDraft.introTimeline)) {
        setIntroTimeline(existingDraft.introTimeline as TimelineFrame[]);
      }
      if (existingDraft.loopTimeline && Array.isArray(existingDraft.loopTimeline)) {
        setLoopTimeline(existingDraft.loopTimeline as TimelineFrame[]);
      }
      if (existingDraft.exitTimeline && Array.isArray(existingDraft.exitTimeline)) {
        setExitTimeline(existingDraft.exitTimeline as TimelineFrame[]);
      }
    }

    // Marquer comme initialisé seulement après que le chargement soit terminé
    setIsInitialized(true);
  }, [existingDraft, isLoadingEmotionVideos, isInitialized]);

  // Auto-save avec debounce quand les 3 timelines changent
  useEffect(() => {
    // Ne pas auto-save avant l'initialisation
    if (!isInitialized) return;

    // Annuler le timeout précédent
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    // Déclencher l'auto-save après le délai
    autoSaveTimeoutRef.current = setTimeout(() => {
      if (emotionVideoId) {
        // Update existing draft
        updateEmotionVideoMutation.mutate({
          introTimeline,
          loopTimeline,
          exitTimeline,
        });
      } else {
        // Create new draft
        createEmotionVideoMutation.mutate(
          {
            emotionId: clip.emotionId,
            sourceClipId: clip.id,
            name: `Montage ${clip.emotion.label}`,
            introTimeline,
            loopTimeline,
            exitTimeline,
          },
          {
            onSuccess: (data) => {
              setEmotionVideoId(data.id);
            },
          }
        );
      }
    }, AUTO_SAVE_DELAY_MS);

    // Cleanup
    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [introTimeline, loopTimeline, exitTimeline, isInitialized, emotionVideoId]);

  // Fonction pour obtenir les régions et artefacts d'une frame (complète ou composite)
  const getFrameContent = (frame: TimelineFrame) => {
    if (frame.type === 'full' && frame.sourceFrameIndex !== undefined) {
      const regions = regionsByFrame[frame.sourceFrameIndex] || null;
      const artifacts = artifactsByFrame[frame.sourceFrameIndex] || [];
      return { regions, artifacts };
    } else if (frame.type === 'composite') {
      // Pour les frames composites, reconstruire FaceRegions depuis TimelineRegions
      const regions: FaceRegions = {
        leftEye: frame.regions?.leftEye ? {
          x: frame.regions.leftEye.x,
          y: frame.regions.leftEye.y,
          w: frame.regions.leftEye.w,
          h: frame.regions.leftEye.h,
          imageUrl: frame.regions.leftEye.imageUrl,
        } : undefined,
        rightEye: frame.regions?.rightEye ? {
          x: frame.regions.rightEye.x,
          y: frame.regions.rightEye.y,
          w: frame.regions.rightEye.w,
          h: frame.regions.rightEye.h,
          imageUrl: frame.regions.rightEye.imageUrl,
        } : undefined,
        mouth: frame.regions?.mouth ? {
          x: frame.regions.mouth.x,
          y: frame.regions.mouth.y,
          w: frame.regions.mouth.w,
          h: frame.regions.mouth.h,
          imageUrl: frame.regions.mouth.imageUrl,
        } : undefined,
      };

      const artifacts: ArtifactRegion[] = (frame.artifacts || []).map((a: TimelineArtifact) => ({
        name: a.name,
        x: a.x,
        y: a.y,
        w: a.w,
        h: a.h,
        imageUrl: a.imageUrl,
      }));

      return { regions, artifacts };
    }
    return { regions: null, artifacts: [] };
  };

  const handleAddFullFrame = (sourceFrameIndex: number, targetPhase: 'intro' | 'loop' | 'exit' = 'loop') => {
    // Ajouter à la phase cible
    if (targetPhase === 'intro') {
      const newFrame: TimelineFrame = {
        frameIndex: introTimeline.length,
        type: 'full',
        sourceFrameIndex,
      };
      setIntroTimeline([...introTimeline, newFrame]);
    } else if (targetPhase === 'loop') {
      const newFrame: TimelineFrame = {
        frameIndex: loopTimeline.length,
        type: 'full',
        sourceFrameIndex,
      };
      setLoopTimeline([...loopTimeline, newFrame]);
    } else {
      const newFrame: TimelineFrame = {
        frameIndex: exitTimeline.length,
        type: 'full',
        sourceFrameIndex,
      };
      setExitTimeline([...exitTimeline, newFrame]);
    }
  };

  const handleAddCompositeFrame = (
    regions: {
      leftEye?: TimelineRegion;
      rightEye?: TimelineRegion;
      mouth?: TimelineRegion;
    },
    artifacts: TimelineArtifact[],
    targetPhase: 'intro' | 'loop' | 'exit' = 'loop'
  ) => {
    // Mode édition : remplacer la frame existante
    if (editingFrameGlobalIndex !== null) {
      const globalIndex = editingFrameGlobalIndex;

      if (globalIndex < introTimeline.length) {
        // Éditer dans intro
        const localIndex = globalIndex;
        setIntroTimeline(introTimeline.map((f, i) =>
          i === localIndex
            ? { ...f, type: 'composite' as const, regions, artifacts: artifacts.length > 0 ? artifacts : undefined }
            : f
        ));
      } else if (globalIndex < introTimeline.length + loopTimeline.length) {
        // Éditer dans loop
        const localIndex = globalIndex - introTimeline.length;
        setLoopTimeline(loopTimeline.map((f, i) =>
          i === localIndex
            ? { ...f, type: 'composite' as const, regions, artifacts: artifacts.length > 0 ? artifacts : undefined }
            : f
        ));
      } else {
        // Éditer dans exit
        const localIndex = globalIndex - introTimeline.length - loopTimeline.length;
        setExitTimeline(exitTimeline.map((f, i) =>
          i === localIndex
            ? { ...f, type: 'composite' as const, regions, artifacts: artifacts.length > 0 ? artifacts : undefined }
            : f
        ));
      }

      // Réinitialiser le mode édition
      setEditingFrameGlobalIndex(null);
    } else {
      // Mode ajout : ajouter à la phase cible
      if (targetPhase === 'intro') {
        const newFrame: TimelineFrame = {
          frameIndex: introTimeline.length,
          type: 'composite',
          regions,
          artifacts: artifacts.length > 0 ? artifacts : undefined,
        };
        setIntroTimeline([...introTimeline, newFrame]);
      } else if (targetPhase === 'loop') {
        const newFrame: TimelineFrame = {
          frameIndex: loopTimeline.length,
          type: 'composite',
          regions,
          artifacts: artifacts.length > 0 ? artifacts : undefined,
        };
        setLoopTimeline([...loopTimeline, newFrame]);
      } else {
        const newFrame: TimelineFrame = {
          frameIndex: exitTimeline.length,
          type: 'composite',
          regions,
          artifacts: artifacts.length > 0 ? artifacts : undefined,
        };
        setExitTimeline([...exitTimeline, newFrame]);
      }
    }

    // Sauvegarder la dernière composition pour réutilisation rapide
    setLastCompositeFrame({ regions, artifacts });
  };

  const handleRemoveFrame = (globalFrameIndex: number) => {
    // Déterminer à quelle phase appartient cette frame globale
    if (globalFrameIndex < introTimeline.length) {
      // Frame dans intro
      const localIndex = globalFrameIndex;
      setIntroTimeline(introTimeline.filter((_, i) => i !== localIndex).map((f, idx) => ({ ...f, frameIndex: idx })));
    } else if (globalFrameIndex < introTimeline.length + loopTimeline.length) {
      // Frame dans loop
      const localIndex = globalFrameIndex - introTimeline.length;
      setLoopTimeline(loopTimeline.filter((_, i) => i !== localIndex).map((f, idx) => ({ ...f, frameIndex: idx })));
    } else {
      // Frame dans exit
      const localIndex = globalFrameIndex - introTimeline.length - loopTimeline.length;
      setExitTimeline(exitTimeline.filter((_, i) => i !== localIndex).map((f, idx) => ({ ...f, frameIndex: idx })));
    }
  };

  const handleClearTimeline = () => {
    if (confirm('Voulez-vous vraiment réinitialiser la timeline ?')) {
      // Réinitialiser : toutes les frames dans intro, loop et exit vides
      const framesToAdd = Math.min(totalFrames, maxFrames);

      const initialIntro: TimelineFrame[] = [];
      for (let i = 0; i < framesToAdd; i++) {
        initialIntro.push({
          frameIndex: i,
          type: 'full',
          sourceFrameIndex: i,
        });
      }

      setIntroTimeline(initialIntro);
      setLoopTimeline([]);
      setExitTimeline([]);
      setCurrentPreviewFrame(0);
    }
  };

  // Drag & Drop handlers (TODO: Adapter pour drag entre phases)
  const handleDragStart = (e: React.DragEvent, frameIndex: number) => {
    setDraggedFrameIndex(frameIndex);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();

    if (draggedFrameIndex === null || draggedFrameIndex === targetIndex) {
      setDraggedFrameIndex(null);
      return;
    }

    // Helper pour trouver la phase et l'index local d'un index global
    const getPhaseAndLocalIndex = (globalIndex: number) => {
      if (globalIndex < introTimeline.length) {
        return { phase: 'intro' as const, localIndex: globalIndex };
      }
      if (globalIndex < introTimeline.length + loopTimeline.length) {
        return { phase: 'loop' as const, localIndex: globalIndex - introTimeline.length };
      }
      return { phase: 'exit' as const, localIndex: globalIndex - introTimeline.length - loopTimeline.length };
    };

    const source = getPhaseAndLocalIndex(draggedFrameIndex);
    const target = getPhaseAndLocalIndex(targetIndex);

    // Extraire la frame de la phase source
    let draggedFrame: TimelineFrame | null = null;
    let newIntro = [...introTimeline];
    let newLoop = [...loopTimeline];
    let newExit = [...exitTimeline];

    if (source.phase === 'intro') {
      draggedFrame = newIntro[source.localIndex];
      newIntro.splice(source.localIndex, 1);
    } else if (source.phase === 'loop') {
      draggedFrame = newLoop[source.localIndex];
      newLoop.splice(source.localIndex, 1);
    } else {
      draggedFrame = newExit[source.localIndex];
      newExit.splice(source.localIndex, 1);
    }

    if (!draggedFrame) {
      setDraggedFrameIndex(null);
      return;
    }

    // Ajuster l'index cible si on déplace vers le bas dans la même phase
    let adjustedTargetIndex = target.localIndex;
    if (source.phase === target.phase && source.localIndex < target.localIndex) {
      adjustedTargetIndex--;
    }

    // Insérer la frame dans la phase cible
    if (target.phase === 'intro') {
      newIntro.splice(adjustedTargetIndex, 0, draggedFrame);
    } else if (target.phase === 'loop') {
      newLoop.splice(adjustedTargetIndex, 0, draggedFrame);
    } else {
      newExit.splice(adjustedTargetIndex, 0, draggedFrame);
    }

    // Mettre à jour les frameIndex dans chaque phase
    newIntro = newIntro.map((f, idx) => ({ ...f, frameIndex: idx }));
    newLoop = newLoop.map((f, idx) => ({ ...f, frameIndex: idx }));
    newExit = newExit.map((f, idx) => ({ ...f, frameIndex: idx }));

    // Appliquer les changements
    setIntroTimeline(newIntro);
    setLoopTimeline(newLoop);
    setExitTimeline(newExit);
    setDraggedFrameIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedFrameIndex(null);
  };

  const handleFrameClick = (frameIndex: number) => {
    setCurrentPreviewFrame(frameIndex);
  };

  // Handlers pour ouvrir les dialogs avec la phase cible
  const handleOpenFullFrameDialog = (phase: 'intro' | 'loop' | 'exit') => {
    setTargetPhase(phase);
    setFramesDialogOpen(true);
  };

  const handleOpenCompositeFrameDialog = (phase: 'intro' | 'loop' | 'exit') => {
    setTargetPhase(phase);
    setCompositeFrameDialogOpen(true);
  };

  const handleEditFrame = (globalFrameIndex: number) => {
    // Déterminer quelle phase contient cette frame
    let frame: TimelineFrame | null = null;
    let phase: 'intro' | 'loop' | 'exit' = 'intro';

    if (globalFrameIndex < introTimeline.length) {
      frame = introTimeline[globalFrameIndex];
      phase = 'intro';
    } else if (globalFrameIndex < introTimeline.length + loopTimeline.length) {
      frame = loopTimeline[globalFrameIndex - introTimeline.length];
      phase = 'loop';
    } else {
      frame = exitTimeline[globalFrameIndex - introTimeline.length - loopTimeline.length];
      phase = 'exit';
    }

    // Seules les frames composites peuvent être éditées
    if (!frame || frame.type !== 'composite') return;

    // Pré-remplir le dialog avec les données de la frame
    setLastCompositeFrame({
      regions: frame.regions || {},
      artifacts: frame.artifacts || [],
    });

    // Stocker l'index de la frame en cours d'édition
    setEditingFrameGlobalIndex(globalFrameIndex);
    setTargetPhase(phase);
    setCompositeFrameDialogOpen(true);
  };

  // Obtenir toutes les frames (intro + loop + exit) pour faciliter l'accès
  const allFrames = useMemo(() => {
    return [...introTimeline, ...loopTimeline, ...exitTimeline];
  }, [introTimeline, loopTimeline, exitTimeline]);

  // Obtenir le contenu de la frame courante pour le preview
  const currentFrameContent = allFrames[currentPreviewFrame]
    ? getFrameContent(allFrames[currentPreviewFrame])
    : { regions: null, artifacts: [] };

  const [jsonPreviewOpen, setJsonPreviewOpen] = useState(false);

  // Construire le JSON qui sera envoyé à l'ESP32 (nouveau format avec 3 phases)
  const generateESP32Json = () => {
    const totalFrames = introTimeline.length + loopTimeline.length + exitTimeline.length;

    // Fonction helper pour extraire le sourceFrameIndex d'une frame
    const getSourceFrameIndex = (frame: TimelineFrame): number | null => {
      // Si c'est une frame 'full', retourner directement le sourceFrameIndex
      if (frame.type === 'full' && frame.sourceFrameIndex !== undefined) {
        return frame.sourceFrameIndex;
      }

      // Si c'est une frame 'composite', prendre le sourceFrameIndex de la première région disponible
      if (frame.type === 'composite' && frame.regions) {
        if (frame.regions.leftEye?.sourceFrameIndex !== undefined) {
          return frame.regions.leftEye.sourceFrameIndex;
        }
        if (frame.regions.rightEye?.sourceFrameIndex !== undefined) {
          return frame.regions.rightEye.sourceFrameIndex;
        }
        if (frame.regions.mouth?.sourceFrameIndex !== undefined) {
          return frame.regions.mouth.sourceFrameIndex;
        }
      }

      return null;
    };

    // Extraire les sourceFrameIndex de toutes les frames de chaque phase
    const mapTimeline = (timeline: TimelineFrame[]) => timeline.map(getSourceFrameIndex);

    return {
      emotionId: clip.emotionId,
      emotionKey: clip.emotion.key,
      fps,
      width: 240,
      height: 280,
      totalFrames,
      durationS: totalFrames / fps,
      phases: {
        intro: {
          frames: introTimeline.length,
          timeline: mapTimeline(introTimeline),
        },
        loop: {
          frames: loopTimeline.length,
          timeline: mapTimeline(loopTimeline),
        },
        exit: {
          frames: exitTimeline.length,
          timeline: mapTimeline(exitTimeline),
        },
      },
    };
  };

  return (
    <div className="space-y-6">
      {/* Indicateur de sauvegarde */}
      <div className="flex items-center gap-2">
        {(createEmotionVideoMutation.isPending || updateEmotionVideoMutation.isPending) && (
          <span className="text-xs text-muted-foreground">
            💾 Sauvegarde...
          </span>
        )}
        {emotionVideoId && !createEmotionVideoMutation.isPending && !updateEmotionVideoMutation.isPending && (
          <span className="text-xs text-green-600">
            ✓ Sauvegardé
          </span>
        )}
      </div>

      {/* Timeline avec 3 phases séparées */}
      <TimelineBar
        introTimeline={introTimeline}
        loopTimeline={loopTimeline}
        exitTimeline={exitTimeline}
        currentPreviewFrame={currentPreviewFrame}
        draggedFrameIndex={draggedFrameIndex}
        fps={fps}
        maxDuration={MAX_DURATION_S}
        getFrameContent={getFrameContent}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onDragEnd={handleDragEnd}
        onFrameClick={handleFrameClick}
        onFrameRemove={handleRemoveFrame}
        onFrameEdit={handleEditFrame}
        onClearTimeline={handleClearTimeline}
        onAddFullFrame={handleOpenFullFrameDialog}
        onAddCompositeFrame={handleOpenCompositeFrameDialog}
      />

      {/* Aperçu en temps réel avec gestion des 3 phases */}
      <PreviewPanel
        currentFrame={currentPreviewFrame}
        totalFrames={allFrames.length}
        fps={fps}
        introFrameCount={introTimeline.length}
        loopFrameCount={loopTimeline.length}
        exitFrameCount={exitTimeline.length}
        regions={currentFrameContent.regions}
        artifacts={currentFrameContent.artifacts}
        onPrevious={() => setCurrentPreviewFrame(Math.max(0, currentPreviewFrame - 1))}
        onNext={() => setCurrentPreviewFrame(Math.min(allFrames.length - 1, currentPreviewFrame + 1))}
        onFrameChange={setCurrentPreviewFrame}
      />

      {/* Actions finales */}
      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setJsonPreviewOpen(true)}
          title="Voir le JSON qui sera envoyé à l'ESP32"
        >
          📄 Aperçu JSON
        </Button>
        <Button
          type="button"
          variant="default"
          size="sm"
          disabled={allFrames.length === 0 || !emotionVideoId || generateEmotionVideoMutation.isPending}
          onClick={() => {
            if (!emotionVideoId) return;
            generateEmotionVideoMutation.mutate();
          }}
        >
          {generateEmotionVideoMutation.isPending ? 'Génération...' : 'Générer le .bin'}
        </Button>
      </div>

      {/* Dialog pour ajouter des frames complètes */}
      <FramesDialog
        open={framesDialogOpen}
        onOpenChange={setFramesDialogOpen}
        totalFrames={totalFrames}
        regionsByFrame={regionsByFrame}
        artifactsByFrame={artifactsByFrame}
        onSelectFrame={(sourceIdx) => handleAddFullFrame(sourceIdx, targetPhase)}
      />

      {/* Dialog pour créer des frames composites */}
      <CompositeFrameDialog
        open={compositeFrameDialogOpen}
        onOpenChange={(open) => {
          setCompositeFrameDialogOpen(open);
          if (!open) {
            // Réinitialiser le mode édition quand le dialog se ferme
            setEditingFrameGlobalIndex(null);
          }
        }}
        totalFrames={totalFrames}
        regionsByFrame={regionsByFrame}
        artifactsByFrame={artifactsByFrame}
        lastCompositeFrame={lastCompositeFrame}
        isEditMode={editingFrameGlobalIndex !== null}
        onCreateCompositeFrame={(regions, artifacts) => handleAddCompositeFrame(regions, artifacts, targetPhase)}
      />

      {/* Dialog pour l'aperçu du JSON ESP32 */}
      <Dialog open={jsonPreviewOpen} onOpenChange={setJsonPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle>Aperçu du JSON pour l'ESP32</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="rounded bg-muted p-3 text-xs text-muted-foreground">
              Ce JSON représente la structure de données qui sera envoyée à l&apos;ESP32 pour l&apos;animation.
            </div>
            <div className="relative">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="absolute right-2 top-2 z-10"
                onClick={() => {
                  navigator.clipboard.writeText(JSON.stringify(generateESP32Json(), null, 2));
                }}
              >
                📋 Copier
              </Button>
              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-zinc-950 p-4 text-xs text-zinc-300">
                {JSON.stringify(generateESP32Json(), null, 2)}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
