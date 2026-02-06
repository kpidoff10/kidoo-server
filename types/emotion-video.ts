/**
 * Types pour le système de composition vidéo (EmotionVideo)
 * Permet de créer des animations custom en composant des frames
 */

export type RegionKey = 'leftEye' | 'rightEye' | 'mouth';

/**
 * Région faciale source pour une frame composée
 */
export interface TimelineRegion {
  sourceFrameIndex: number; // Index de la frame source dont on prend la région
  x: number;                // Position X normalisée (0-1)
  y: number;                // Position Y normalisée (0-1)
  w: number;                // Largeur normalisée (0-1)
  h: number;                // Hauteur normalisée (0-1)
  imageUrl: string;         // URL de l'image de la région
}

/** Effet de vibration : court, long, saccadé, etc. */
export type VibrationEffect = 'short' | 'long' | 'saccade' | 'pulse' | 'double';

/**
 * Action matérielle à déclencher sur l'ESP32 lors de cette frame (vibration, LED).
 */
export type FrameAction =
  | { type: 'vibration'; effect?: VibrationEffect; intensity?: number; durationMs?: number }
  | { type: 'led'; color: string }; // Couleur hex (ex: "#ff0000")

/**
 * Artefact (ex: Zzz, cœur, etc.) pour une frame
 */
export interface TimelineArtifact {
  name: string;              // Nom de l'artefact (ex: "zzz", "heart")
  x: number;                 // Position X normalisée (0-1)
  y: number;                 // Position Y normalisée (0-1)
  w: number;                 // Largeur normalisée (0-1)
  h: number;                 // Hauteur normalisée (0-1)
  imageUrl: string;          // URL de l'image de l'artefact
  sourceFrameIndex?: number; // Frame source (optionnel si c'est un nouvel artefact)
  artifactIndex?: number;    // Index de l'artefact dans la frame source
}

/**
 * Frame dans la timeline de composition
 */
export interface TimelineFrame {
  frameIndex: number;        // Position dans la timeline (0, 1, 2...)
  type: 'full' | 'composite'; // Frame complète ou composée

  // Si type === 'full' : copie complète d'une frame existante
  sourceFrameIndex?: number;

  // Si type === 'composite' : composition custom de régions
  regions?: {
    leftEye?: TimelineRegion;
    rightEye?: TimelineRegion;
    mouth?: TimelineRegion;
  };

  // Artefacts (disponible pour les deux types)
  artifacts?: TimelineArtifact[];

  /** Actions matérielles (vibration, LED) à déclencher sur l'ESP32 lors de cette frame */
  actions?: FrameAction[];
}

/**
 * Configuration de la timeline complète (ancien format - conservé pour compatibilité)
 */
export interface EmotionVideoTimeline {
  frames: TimelineFrame[];
  fps: number;              // FPS de la vidéo finale (default: 10)
  maxDurationS: number;     // Durée max (6 secondes)
}

/**
 * Phase de l'animation (intro, loop, exit)
 */
export type AnimationPhase = 'intro' | 'loop' | 'exit';

/**
 * Configuration des 3 timelines (nouveau format avec phases séparées)
 */
export interface EmotionVideoTimelines {
  introTimeline: TimelineFrame[];  // Frames d'introduction (optionnel, peut être vide)
  loopTimeline: TimelineFrame[];   // Frames à boucler (OBLIGATOIRE, minimum 1 frame)
  exitTimeline: TimelineFrame[];   // Frames de sortie (optionnel, peut être vide)
  fps: number;                     // FPS (défaut: 10)
  maxDurationS: number;            // Durée max totale (6 secondes)
}

/**
 * Métadonnées calculées pour une phase
 */
export interface PhaseMetadata {
  frameCount: number;    // Nombre de frames dans cette phase
  durationS: number;     // Durée de la phase en secondes
  startIndex: number;    // Index global de début (dans l'animation complète)
  endIndex: number;      // Index global de fin (dans l'animation complète)
}

/**
 * Informations complètes sur les 3 phases d'une EmotionVideo
 */
export interface EmotionVideoPhases {
  intro: PhaseMetadata;
  loop: PhaseMetadata;
  exit: PhaseMetadata;
  total: {
    frames: number;     // Total frames (somme des 3 phases)
    durationS: number;  // Durée totale en secondes
  };
}
