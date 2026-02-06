'use client';

import type { FaceRegions, ArtifactRegion } from '../../../../../../../lib/charactersApi';

interface FramePreviewProps {
  width?: number;
  height?: number;
  faceRegions?: FaceRegions | null;
  artifacts?: ArtifactRegion[];
  className?: string;
}

/**
 * Composant pour afficher l'aperçu d'une frame avec régions faciales et artefacts superposés
 * Les imageUrl sont des images masques complètes (240x280) avec fond noir + région blanche
 */
export function FramePreview({
  width = 96,
  height = 112,
  faceRegions,
  artifacts = [],
  className = '',
}: FramePreviewProps) {
  const hasContent = faceRegions || artifacts.length > 0;

  if (!hasContent) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-800 ${className}`}
        style={{ width, height }}
      >
        <span className="text-[10px] text-zinc-500">Vide</span>
      </div>
    );
  }

  return (
    <div
      className={`relative overflow-hidden bg-black ${className}`}
      style={{ width, height }}
    >
      {/* Fond noir (comme sur ESP32) */}
      <div className="absolute inset-0 bg-black" />

      {/*
        Les imageUrl sont des images masques complètes (240x280) :
        - Fond noir
        - Région en blanc/couleur à la bonne position
        On les superpose avec mix-blend-mode: lighten pour que le noir disparaisse
      */}

      {/* Régions faciales */}
      {faceRegions?.leftEye?.imageUrl && (
        <img
          src={faceRegions.leftEye.imageUrl}
          alt="Left Eye"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            mixBlendMode: 'lighten',
          }}
        />
      )}

      {faceRegions?.rightEye?.imageUrl && (
        <img
          src={faceRegions.rightEye.imageUrl}
          alt="Right Eye"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            mixBlendMode: 'lighten',
          }}
        />
      )}

      {faceRegions?.mouth?.imageUrl && (
        <img
          src={faceRegions.mouth.imageUrl}
          alt="Mouth"
          className="absolute inset-0 h-full w-full object-contain"
          style={{
            mixBlendMode: 'lighten',
          }}
        />
      )}

      {/* Artefacts */}
      {artifacts.map((artifact, idx) =>
        artifact.imageUrl ? (
          <img
            key={idx}
            src={artifact.imageUrl}
            alt={artifact.name}
            className="absolute inset-0 h-full w-full object-contain"
            style={{
              mixBlendMode: 'lighten',
            }}
          />
        ) : null
      )}
    </div>
  );
}
