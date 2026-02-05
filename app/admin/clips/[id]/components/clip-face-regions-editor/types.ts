import type {
  CharacterClipDetail,
  FaceRegions,
  ArtifactRegion,
} from '../../../../lib/charactersApi';

export type { CharacterClipDetail, FaceRegions, ArtifactRegion };

export interface ClipFaceRegionsEditorProps {
  clip: CharacterClipDetail;
  onSave?: (data: {
    faceRegionsByFrame: Record<string, FaceRegions>;
    artifactsByFrame: Record<string, ArtifactRegion[]>;
  }) => void;
  isSaving?: boolean;
}
