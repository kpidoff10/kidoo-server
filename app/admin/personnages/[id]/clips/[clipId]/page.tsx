'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useClip, useUpdateClip, useTrimClip, useGenerateRegionImages } from '../../../../hooks/useCharacters';
import {
  ClipDetailBreadcrumb,
  ClipDetailInfo,
  ClipDetailActions,
  ClipDetailPreview,
} from './components';

export default function AdminClipDetailPage() {
  const params = useParams();
  const id = params.clipId as string;
  const { data: clip, isLoading, error } = useClip(id);
  const updateClipMutation = useUpdateClip(id);
  const trimClipMutation = useTrimClip(id);
  const generateRegionImagesMutation = useGenerateRegionImages(id);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <p className="text-sm text-muted-foreground">Chargement du clip…</p>
      </div>
    );
  }

  if (error || !clip) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-10">
        <Link href="/admin/personnages" className="text-sm text-muted-foreground hover:text-foreground">
          ← Personnages
        </Link>
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Clip introuvable.'}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <ClipDetailBreadcrumb clip={clip} />

      <h1 className="text-2xl font-bold text-foreground">Détail clip</h1>

      <div className="mt-6 space-y-4">
        <ClipDetailInfo clip={clip} />
        <ClipDetailPreview
          clip={clip}
          onSaveRegions={(data) => updateClipMutation.mutate(data)}
          onTrim={(startTimeS, endTimeS) =>
            trimClipMutation.mutateAsync({ startTimeS, endTimeS })
          }
          onGenerateRegionImages={() => generateRegionImagesMutation.mutate()}
          isSavingRegions={updateClipMutation.isPending}
          isTrimming={trimClipMutation.isPending}
          isGeneratingRegionImages={generateRegionImagesMutation.isPending}
        />
        <ClipDetailActions clip={clip} />
      </div>
    </div>
  );
}
