'use client';

import { Button } from '@/components/ui/button';
import type { TimelineFrame as TimelineFrameType, AnimationPhase, FrameAction } from '@/types/emotion-video';
import type { FaceRegions, ArtifactRegion } from '@/app/admin/lib/charactersApi';
import { TimelineFrame } from './TimelineFrame';
import { FrameActionsEditor } from './FrameActionsEditor';

interface TimelineBarProps {
  introTimeline: TimelineFrameType[];
  loopTimeline: TimelineFrameType[];
  exitTimeline: TimelineFrameType[];
  currentPreviewFrame: number;
  draggedFrameIndex: number | null;
  fps: number;
  maxDuration: number;
  getFrameContent: (frame: TimelineFrameType) => {
    regions: FaceRegions | null;
    artifacts: ArtifactRegion[];
  };
  onDragStart: (e: React.DragEvent, frameIndex: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onDragEnd: () => void;
  onFrameClick: (frameIndex: number) => void;
  onFrameRemove: (frameIndex: number) => void;
  onFrameEdit?: (frameIndex: number) => void;
  onFrameActionsChange?: (frameIndex: number, actions: FrameAction[]) => void;
  currentFrameActions?: FrameAction[];
  onClearTimeline: () => void;
  onAddFullFrame: (targetPhase: AnimationPhase) => void;
  onAddCompositeFrame: (targetPhase: AnimationPhase) => void;
}

export function TimelineBar({
  introTimeline,
  loopTimeline,
  exitTimeline,
  currentPreviewFrame,
  draggedFrameIndex,
  fps,
  maxDuration,
  getFrameContent,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onFrameClick,
  onFrameRemove,
  onFrameEdit,
  onFrameActionsChange,
  currentFrameActions = [],
  onClearTimeline,
  onAddFullFrame,
  onAddCompositeFrame,
}: TimelineBarProps) {
  const totalFrames = introTimeline.length + loopTimeline.length + exitTimeline.length;
  const timelineDuration = totalFrames / fps;

  if (totalFrames === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-border/60 bg-gradient-to-br from-muted/30 to-muted/10 p-12 text-center">
        <p className="text-sm text-muted-foreground">
          La timeline est vide. Les frames du clip ont été initialisées automatiquement.
        </p>
      </div>
    );
  }

  // Helper function to render a phase section
  const renderPhase = (
    timeline: TimelineFrameType[],
    phase: AnimationPhase,
    label: string,
    borderColor: string,
    bgColor: string,
    startIndex: number
  ) => {
    if (timeline.length === 0) {
      return (
        <div className={`flex flex-col gap-2 rounded-lg border-2 border-dashed ${borderColor} ${bgColor} p-3`}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              0 frame
            </span>
            <button
              type="button"
              onClick={() => onAddFullFrame(phase)}
              className="ml-auto flex h-6 w-6 items-center justify-center rounded bg-background/80 text-sm font-bold hover:bg-background transition-colors"
              title="Ajouter une frame complète"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => onAddCompositeFrame(phase)}
              className="flex h-6 w-6 items-center justify-center rounded bg-background/80 text-sm font-bold hover:bg-background transition-colors"
              title="Ajouter une frame composite"
            >
              ⊕
            </button>
          </div>
          <div className="text-center py-4">
            <p className="text-[10px] text-muted-foreground">Aucune frame</p>
          </div>
        </div>
      );
    }

    return (
      <div className={`flex flex-col gap-2 rounded-lg border-2 ${borderColor} ${bgColor} p-3`}>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
          <span className="rounded-full bg-background/80 px-2 py-0.5 text-[10px] font-medium">
            {timeline.length} frame{timeline.length > 1 ? 's' : ''} • {(timeline.length / fps).toFixed(2)}s
          </span>
          <button
            type="button"
            onClick={() => onAddFullFrame(phase)}
            className="ml-auto flex h-6 w-6 items-center justify-center rounded bg-background/80 text-sm font-bold hover:bg-background transition-colors"
            title="Ajouter une frame complète"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => onAddCompositeFrame(phase)}
            className="flex h-6 w-6 items-center justify-center rounded bg-background/80 text-sm font-bold hover:bg-background transition-colors"
            title="Ajouter une frame composite"
          >
            ⊕
          </button>
        </div>
        <div className="flex gap-1 overflow-x-auto pt-6 pb-2 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-zinc-700">
          {timeline.map((frame, idx) => {
            const globalIndex = startIndex + idx;
            const isActive = globalIndex === currentPreviewFrame;
            const isDragging = draggedFrameIndex === globalIndex;
            const { regions, artifacts } = getFrameContent(frame);

            return (
              <TimelineFrame
                key={globalIndex}
                frame={frame}
                index={idx}
                globalIndex={globalIndex}
                phase={phase}
                isActive={isActive}
                isDragging={isDragging}
                fps={fps}
                regions={regions}
                artifacts={artifacts}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onClick={() => onFrameClick(globalIndex)}
                onRemove={onFrameRemove}
                onEdit={onFrameEdit}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Calculate current frame data from all phases
  const getCurrentFrameData = () => {
    if (currentPreviewFrame < introTimeline.length) {
      return { frame: introTimeline[currentPreviewFrame], phase: 'intro' as AnimationPhase };
    }
    if (currentPreviewFrame < introTimeline.length + loopTimeline.length) {
      return { frame: loopTimeline[currentPreviewFrame - introTimeline.length], phase: 'loop' as AnimationPhase };
    }
    return { frame: exitTimeline[currentPreviewFrame - introTimeline.length - loopTimeline.length], phase: 'exit' as AnimationPhase };
  };

  const currentFrameData = currentPreviewFrame >= 0 && currentPreviewFrame < totalFrames ? getCurrentFrameData() : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Timeline (3 Phases)</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {totalFrames} frame{totalFrames > 1 ? 's' : ''} • {timelineDuration.toFixed(2)}s / {maxDuration}s
          </span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClearTimeline}
        >
          Réinitialiser
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 p-4 shadow-lg">
        {/* 3 sections de timeline */}
        <div className="space-y-3 mb-3">
          {/* INTRO */}
          {renderPhase(
            introTimeline,
            'intro',
            '📥 INTRO',
            'border-blue-500',
            'bg-blue-500/5',
            0
          )}

          {/* LOOP */}
          {renderPhase(
            loopTimeline,
            'loop',
            '🔁 LOOP',
            'border-orange-500',
            'bg-orange-500/5',
            introTimeline.length
          )}

          {/* EXIT */}
          {renderPhase(
            exitTimeline,
            'exit',
            '📤 EXIT',
            'border-purple-500',
            'bg-purple-500/5',
            introTimeline.length + loopTimeline.length
          )}
        </div>

        {/* Infos sur la frame sélectionnée */}
        {currentFrameData && (
          <div className="rounded-lg border border-zinc-700/50 bg-zinc-900/50 p-3 backdrop-blur-sm">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="rounded bg-blue-500/20 px-2 py-1 font-mono font-medium text-blue-400">
                  Frame {currentPreviewFrame + 1}
                </span>
                <span className="text-zinc-400">•</span>
                <span className={`rounded px-2 py-1 font-medium ${
                  currentFrameData.phase === 'intro' ? 'bg-blue-500/20 text-blue-400' :
                  currentFrameData.phase === 'loop' ? 'bg-orange-500/20 text-orange-400' :
                  'bg-purple-500/20 text-purple-400'
                }`}>
                  {currentFrameData.phase.toUpperCase()}
                </span>
                <span className="text-zinc-400">•</span>
                <span className="text-zinc-300">
                  {currentFrameData.frame.type === 'full' ? 'Frame complète' : 'Frame composite'}
                </span>
                {currentFrameData.frame.type === 'full' && currentFrameData.frame.sourceFrameIndex !== undefined && (
                  <>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400">Source: Frame #{currentFrameData.frame.sourceFrameIndex + 1}</span>
                  </>
                )}
                {currentFrameData.frame.type === 'composite' && currentFrameData.frame.regions && (
                  <>
                    <span className="text-zinc-400">•</span>
                    <span className="text-zinc-400 text-[10px]">
                      {currentFrameData.frame.regions?.leftEye && `👁️${currentFrameData.frame.regions.leftEye.sourceFrameIndex + 1} `}
                      {currentFrameData.frame.regions?.rightEye && `👁️${currentFrameData.frame.regions.rightEye.sourceFrameIndex + 1} `}
                      {currentFrameData.frame.regions?.mouth && `👄${currentFrameData.frame.regions.mouth.sourceFrameIndex + 1}`}
                    </span>
                  </>
                )}
              </div>
              <div className="font-mono text-zinc-400">
                {(currentPreviewFrame / fps).toFixed(2)}s / {timelineDuration.toFixed(2)}s
              </div>
            </div>
            {onFrameActionsChange && (
              <div className="mt-3 pt-3 border-t border-zinc-700/50">
                <FrameActionsEditor
                  actions={currentFrameActions}
                  onChange={(actions) => onFrameActionsChange(currentPreviewFrame, actions)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
