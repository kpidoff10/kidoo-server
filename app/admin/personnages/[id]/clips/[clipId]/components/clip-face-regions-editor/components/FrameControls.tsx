'use client';

import { Button } from '@/components/ui/button';

export interface FrameControlsProps {
  currentFrameIndex: number;
  totalFrames: number;
  framesManaged: number;
  onGoToFrame: (index: number) => void;
}

export function FrameControls({
  currentFrameIndex,
  totalFrames,
  framesManaged,
  onGoToFrame,
}: FrameControlsProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="text-xs font-medium text-foreground">Frame</span>
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onGoToFrame(currentFrameIndex - 1)}
        disabled={currentFrameIndex <= 0}
        aria-label="Frame précédente"
      >
        ←
      </Button>
      <input
        type="range"
        min={0}
        max={Math.max(0, totalFrames - 1)}
        step={1}
        value={currentFrameIndex}
        onChange={(e) => onGoToFrame(Number(e.target.value))}
        className="h-2 w-32 cursor-pointer appearance-none rounded-full bg-muted accent-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary"
      />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-8 w-8 shrink-0"
        onClick={() => onGoToFrame(currentFrameIndex + 1)}
        disabled={currentFrameIndex >= totalFrames - 1}
        aria-label="Frame suivante"
      >
        →
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">
        {currentFrameIndex + 1} / {totalFrames}
      </span>
      <span className="text-xs tabular-nums text-green-600 dark:text-green-400">
        ({framesManaged} / {totalFrames} gérées)
      </span>
    </div>
  );
}
