'use client';

import { RefObject } from 'react';
import { formatTime } from './utils';

export interface TrimTrackProps {
  trackRef: RefObject<HTMLDivElement | null>;
  startTimeS: number;
  endTimeS: number;
  duration: number;
  onThumbPointerDown: (e: React.PointerEvent, which: 'start' | 'end') => void;
  onTrackPointerMove: (e: React.PointerEvent) => void;
  onTrackPointerUp: () => void;
  onTrackPointerDown: (e: React.PointerEvent) => void;
  onThumbKeyDown: (e: React.KeyboardEvent, which: 'start' | 'end') => void;
}

export function TrimTrack({
  trackRef,
  startTimeS,
  endTimeS,
  duration,
  onThumbPointerDown,
  onTrackPointerMove,
  onTrackPointerUp,
  onTrackPointerDown,
  onThumbKeyDown,
}: TrimTrackProps) {
  const startPercent = duration > 0 ? (startTimeS / duration) * 100 : 0;
  const widthPercent = duration > 0 ? ((endTimeS - startTimeS) / duration) * 100 : 0;
  const endPercent = duration > 0 ? (endTimeS / duration) * 100 : 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Début (bleu)</span>
        <span className="font-mono tabular-nums">{formatTime(startTimeS)}</span>
      </div>
      <div
        className="relative flex h-8 w-full items-center"
        ref={trackRef}
        onPointerDown={onTrackPointerDown}
        onPointerMove={onTrackPointerMove}
        onPointerUp={onTrackPointerUp}
        onPointerLeave={onTrackPointerUp}
        onPointerCancel={onTrackPointerUp}
      >
        <div className="absolute inset-0 flex items-center pointer-events-none">
          <div className="h-2 w-full rounded-full bg-muted" />
          <div
            className="absolute h-2 rounded-full bg-primary/30"
            style={{
              left: `${startPercent}%`,
              width: `${widthPercent}%`,
            }}
          />
        </div>
        <div
          role="slider"
          aria-label="Début du segment"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={startTimeS}
          tabIndex={0}
          className="absolute z-10 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-blue-500 shadow-md active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{ left: `${startPercent}%` }}
          onPointerDown={(e) => onThumbPointerDown(e, 'start')}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerLeave={onTrackPointerUp}
          onKeyDown={(e) => onThumbKeyDown(e, 'start')}
        />
        <div
          role="slider"
          aria-label="Fin du segment"
          aria-valuemin={0}
          aria-valuemax={duration}
          aria-valuenow={endTimeS}
          tabIndex={0}
          className="absolute z-10 h-5 w-5 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-red-500 shadow-md active:cursor-grabbing focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          style={{ left: `${endPercent}%` }}
          onPointerDown={(e) => onThumbPointerDown(e, 'end')}
          onPointerMove={onTrackPointerMove}
          onPointerUp={onTrackPointerUp}
          onPointerLeave={onTrackPointerUp}
          onKeyDown={(e) => onThumbKeyDown(e, 'end')}
        />
      </div>
      <div className="flex justify-end text-xs text-muted-foreground">
        <span>Fin (rouge)</span>
        <span className="ml-2 font-mono tabular-nums">{formatTime(endTimeS)}</span>
      </div>
    </div>
  );
}
