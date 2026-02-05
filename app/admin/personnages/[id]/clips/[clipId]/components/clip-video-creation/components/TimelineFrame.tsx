'use client';

import type { TimelineFrame as TimelineFrameType, AnimationPhase } from '../../../../../../../types/emotion-video';
import type { FaceRegions, ArtifactRegion } from '../../../../../../../lib/charactersApi';
import { FramePreview } from './FramePreview';

interface TimelineFrameProps {
  frame: TimelineFrameType;
  index: number;
  globalIndex: number;
  phase: AnimationPhase;
  isActive: boolean;
  isDragging: boolean;
  fps: number;
  regions: FaceRegions | null;
  artifacts: ArtifactRegion[];
  onDragStart: (e: React.DragEvent, frameIndex: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetIndex: number) => void;
  onDragEnd: () => void;
  onClick: () => void;
  onRemove: (frameIndex: number) => void;
  onEdit?: (frameIndex: number) => void;
}

export function TimelineFrame({
  frame,
  index,
  globalIndex,
  phase,
  isActive,
  isDragging,
  fps,
  regions,
  artifacts,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onClick,
  onRemove,
  onEdit,
}: TimelineFrameProps) {
  // Color styling based on phase
  const phaseColors = {
    intro: {
      border: 'border-blue-500/80',
      bg: 'bg-blue-500/10',
      shadow: 'shadow-blue-500/20',
      text: 'text-blue-400',
    },
    loop: {
      border: 'border-orange-500/80',
      bg: 'bg-orange-500/10',
      shadow: 'shadow-orange-500/20',
      text: 'text-orange-400',
    },
    exit: {
      border: 'border-purple-500/80',
      bg: 'bg-purple-500/10',
      shadow: 'shadow-purple-500/20',
      text: 'text-purple-400',
    },
  };

  const colors = phaseColors[phase];
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, globalIndex)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, globalIndex)}
      onDragEnd={onDragEnd}
      onClick={onClick}
      className={`group relative shrink-0 cursor-move transition-all ${
        isDragging ? 'opacity-40 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Badge de numéro de frame */}
      <div className="absolute -top-2 left-1/2 z-10 flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full bg-zinc-800 text-[9px] font-bold text-zinc-300 shadow-md ring-1 ring-zinc-700">
        {index + 1}
      </div>

      {/* Bouton de suppression */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(globalIndex);
        }}
        className="absolute -right-1.5 -top-1.5 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white opacity-0 shadow-lg transition-all hover:bg-red-600 hover:scale-110 group-hover:opacity-100"
        title="Supprimer cette frame"
      >
        ×
      </button>

      {/* Bouton d'édition (uniquement pour les frames composites) */}
      {frame.type === 'composite' && onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(globalIndex);
          }}
          className="absolute -right-1.5 top-4 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[11px] font-bold text-white opacity-0 shadow-lg transition-all hover:bg-blue-600 hover:scale-110 group-hover:opacity-100"
          title="Modifier cette frame composite"
        >
          ✏️
        </button>
      )}

      {/* Cadre de la frame avec couleur par phase */}
      <div
        className={`relative overflow-hidden rounded-md border-2 transition-all ${
          isActive
            ? 'border-blue-500 shadow-lg shadow-blue-500/50 ring-2 ring-blue-500/30'
            : `${colors.border} ${colors.bg} shadow-md ${colors.shadow}`
        }`}
      >
        {/* Aperçu composite de la frame */}
        <FramePreview
          width={96}
          height={112}
          faceRegions={regions}
          artifacts={artifacts}
          className="rounded-sm"
        />

        {/* Label du type de frame */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent px-2 py-1 text-center">
          <span className="text-[9px] font-medium text-white">
            {frame.type === 'full' ? 'Complète' : 'Composée'}
          </span>
        </div>

        {/* Indicateur de frame active */}
        {isActive && (
          <div className="absolute inset-0 bg-blue-500/10 pointer-events-none" />
        )}
      </div>

      {/* Timecode sous la frame */}
      <div className="mt-1 text-center text-[9px] text-zinc-400">
        {(index / fps).toFixed(2)}s
      </div>
    </div>
  );
}
