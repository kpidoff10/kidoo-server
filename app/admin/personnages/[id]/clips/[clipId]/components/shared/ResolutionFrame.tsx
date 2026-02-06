'use client';

import { RefObject, useCallback, useEffect, useState } from 'react';

export interface ResolutionFrameProps {
  /** Ref vers le container parent (position: relative) */
  containerRef: RefObject<HTMLElement | null>;
  /** Ref vers l'élément média (video ou img) */
  mediaRef: RefObject<HTMLVideoElement | HTMLImageElement | null>;
  /** Largeur cible du personnage */
  targetWidth?: number;
  /** Hauteur cible du personnage */
  targetHeight?: number;
  /** Afficher ou non (contrôlé de l'extérieur si besoin) */
  visible?: boolean;
}

/**
 * Cadre bleu de résolution superposé sur un média (vidéo/image).
 * Centré sur le média, en respectant le ratio targetWidth/targetHeight.
 * Juste un encadrement, pas de masque sombre.
 */
export function ResolutionFrame({
  containerRef,
  mediaRef,
  targetWidth,
  targetHeight,
  visible = true,
}: ResolutionFrameProps) {
  const [style, setStyle] = useState<React.CSSProperties | null>(null);

  const hasTarget = targetWidth && targetHeight && targetWidth > 0 && targetHeight > 0;

  const compute = useCallback(() => {
    const media = mediaRef.current;
    const container = containerRef.current;
    if (!media || !container || !hasTarget) return;

    const mediaRect = media.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();

    const mediaLeft = mediaRect.left - containerRect.left;
    const mediaTop = mediaRect.top - containerRect.top;
    const mediaW = mediaRect.width;
    const mediaH = mediaRect.height;

    if (mediaW <= 0 || mediaH <= 0) return;

    const targetAR = targetWidth / targetHeight;
    const mediaAR = mediaW / mediaH;

    let frameW: number;
    let frameH: number;

    if (targetAR > mediaAR) {
      frameW = mediaW;
      frameH = mediaW / targetAR;
    } else {
      frameH = mediaH;
      frameW = mediaH * targetAR;
    }

    setStyle({
      position: 'absolute',
      left: `${mediaLeft + (mediaW - frameW) / 2}px`,
      top: `${mediaTop + (mediaH - frameH) / 2}px`,
      width: `${frameW}px`,
      height: `${frameH}px`,
      border: '2px solid rgba(59, 130, 246, 0.8)',
      pointerEvents: 'none',
      zIndex: 10,
      borderRadius: '2px',
    });
  }, [containerRef, mediaRef, hasTarget, targetWidth, targetHeight]);

  useEffect(() => {
    const handleResize = () => compute();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [compute]);

  // Recalculer quand le média est chargé
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const update = () => requestAnimationFrame(compute);

    if (media instanceof HTMLVideoElement) {
      media.addEventListener('loadeddata', update);
      media.addEventListener('loadedmetadata', update);
      return () => {
        media.removeEventListener('loadeddata', update);
        media.removeEventListener('loadedmetadata', update);
      };
    } else {
      media.addEventListener('load', update);
      return () => media.removeEventListener('load', update);
    }
  }, [mediaRef, compute]);

  // Recalculer au premier rendu
  useEffect(() => {
    requestAnimationFrame(compute);
  }, [compute]);

  if (!hasTarget || !visible || !style) return null;

  return <div style={style} />;
}
