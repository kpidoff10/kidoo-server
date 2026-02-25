'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import type { FaceRegions, ArtifactRegion } from '@/app/admin/lib/charactersApi';
import { FramePreview } from './FramePreview';

interface PreviewPanelProps {
  currentFrame: number;
  totalFrames: number;
  fps: number;
  introFrameCount: number;
  loopFrameCount: number;
  exitFrameCount: number;
  regions: FaceRegions | null;
  artifacts: ArtifactRegion[];
  onPrevious: () => void;
  onNext: () => void;
  onFrameChange: (frame: number) => void;
  targetWidth?: number;
  targetHeight?: number;
}

export function PreviewPanel({
  currentFrame,
  totalFrames,
  fps,
  introFrameCount,
  loopFrameCount,
  exitFrameCount,
  regions,
  artifacts,
  onPrevious,
  onNext,
  onFrameChange,
  targetWidth,
  targetHeight,
}: PreviewPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [loopRepeatCount, setLoopRepeatCount] = useState(2); // Nombre de répétitions pour le test
  const [currentLoopIteration, setCurrentLoopIteration] = useState(0);

  // Calculate phase boundaries
  const introEnd = introFrameCount - 1;
  const loopStart = introFrameCount;
  const loopEnd = introFrameCount + loopFrameCount - 1;
  const exitStart = introFrameCount + loopFrameCount;

  // Determine current phase
  const getCurrentPhase = () => {
    if (currentFrame < introFrameCount) return 'intro';
    if (currentFrame < introFrameCount + loopFrameCount) return 'loop';
    return 'exit';
  };

  const currentPhase = getCurrentPhase();
  const hasLoop = loopFrameCount > 0;
  const hasExitPhase = exitFrameCount > 0;

  // Animation automatique quand on joue
  useEffect(() => {
    if (!isPlaying || totalFrames <= 1) return;

    const interval = setInterval(() => {
      const phase = getCurrentPhase();

      if (phase === 'intro') {
        // Phase d'intro - avancer jusqu'au début de la loop
        if (currentFrame < introEnd) {
          onFrameChange(currentFrame + 1);
        } else {
          // Fin de l'intro, passer à la loop
          if (loopFrameCount > 0) {
            onFrameChange(loopStart);
          } else {
            // Pas de loop, arrêter
            setIsPlaying(false);
            onFrameChange(0);
          }
        }
      } else if (phase === 'loop') {
        // Phase de boucle
        if (currentFrame < loopEnd) {
          // Avancer dans la boucle
          onFrameChange(currentFrame + 1);
        } else {
          // Fin de la boucle
          if (currentLoopIteration < loopRepeatCount - 1) {
            // Continue à boucler
            setCurrentLoopIteration(currentLoopIteration + 1);
            onFrameChange(loopStart);
          } else {
            // Fin des répétitions
            if (hasExitPhase) {
              // Passer à la phase de sortie
              onFrameChange(exitStart);
            } else {
              // Pas de sortie, arrêter
              setIsPlaying(false);
              setCurrentLoopIteration(0);
              onFrameChange(0);
            }
          }
        }
      } else {
        // Phase de sortie (exit)
        if (currentFrame < totalFrames - 1) {
          onFrameChange(currentFrame + 1);
        } else {
          // Fin de l'animation
          setIsPlaying(false);
          setCurrentLoopIteration(0);
          onFrameChange(0);
        }
      }
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, currentFrame, totalFrames, fps, introFrameCount, loopFrameCount, exitFrameCount, loopRepeatCount, currentLoopIteration, onFrameChange, introEnd, loopStart, loopEnd, exitStart, hasExitPhase, getCurrentPhase]);

  const handleTogglePlay = () => {
    if (!isPlaying) {
      setCurrentLoopIteration(0);
      onFrameChange(0); // Redémarrer depuis le début
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border pb-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-foreground">Aperçu en temps réel</span>
          {hasLoop && (
            <div className="flex items-center gap-2 rounded bg-orange-500/10 px-2 py-1">
              <label htmlFor="loop-count" className="text-xs text-orange-400">
                Répétitions (test) :
              </label>
              <input
                id="loop-count"
                type="number"
                min="1"
                max="10"
                value={loopRepeatCount}
                onChange={(e) => setLoopRepeatCount(Math.max(1, parseInt(e.target.value) || 1))}
                disabled={isPlaying}
                className="w-12 rounded border border-orange-400/30 bg-zinc-900 px-1 py-0.5 text-center text-xs text-orange-300"
              />
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <Button
            type="button"
            size="sm"
            variant={isPlaying ? 'default' : 'outline'}
            onClick={handleTogglePlay}
            disabled={totalFrames <= 1}
            className="min-w-[80px]"
          >
            {isPlaying ? (
              <>
                <svg viewBox="0 0 24 24" className="mr-1.5 h-3.5 w-3.5" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
                Pause
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="mr-1.5 h-3.5 w-3.5" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Play
              </>
            )}
          </Button>
          <div className="text-xs text-muted-foreground">
            Frame {currentFrame + 1} / {totalFrames}
            {isPlaying && hasLoop && (
              <span className="ml-2 text-orange-400">
                • Boucle {currentLoopIteration + 1}/{loopRepeatCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-center rounded-lg border border-border bg-gradient-to-br from-zinc-950 to-zinc-900 p-8 shadow-inner">
        <div className="relative">
          {/* Aperçu de la frame actuelle composée */}
          <div
            className="rounded-lg shadow-2xl"
            style={{ border: '2px solid rgba(59, 130, 246, 0.8)' }}
          >
            <FramePreview
              width={targetWidth ?? 240}
              height={targetHeight ?? 280}
              faceRegions={regions}
              artifacts={artifacts}
              className="rounded-lg"
            />
          </div>
          {targetWidth && targetHeight && (
            <div className="mt-1 text-center text-[10px] text-blue-400/70">
              {targetWidth}x{targetHeight}
            </div>
          )}

          {/* Indicateur d'animation avec phase */}
          {isPlaying && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2">
              <span className={`rounded-full px-3 py-1 text-xs font-medium text-white shadow-lg whitespace-nowrap ${
                currentPhase === 'intro' ? 'bg-blue-500' :
                currentPhase === 'loop' ? 'bg-orange-500' :
                'bg-purple-500'
              }`}>
                ▶ En lecture ({fps} FPS)
                {currentPhase === 'intro' && <span className="ml-1">📥 INTRO</span>}
                {currentPhase === 'loop' && <span className="ml-1">🔁 LOOP</span>}
                {currentPhase === 'exit' && <span className="ml-1">📤 EXIT</span>}
              </span>
            </div>
          )}

          {/* Contrôles de navigation */}
          <div className="mt-4 flex items-center justify-center gap-3">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onPrevious}
              disabled={currentFrame === 0 || isPlaying}
              className="min-w-[100px]"
            >
              ← Précédent
            </Button>
            <span className="min-w-[80px] text-center text-sm font-mono text-muted-foreground">
              {(currentFrame / fps).toFixed(2)}s
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onNext}
              disabled={currentFrame >= totalFrames - 1 || isPlaying}
              className="min-w-[100px]"
            >
              Suivant →
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
