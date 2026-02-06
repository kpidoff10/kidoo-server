'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useClip, useUpdateClip, useTrimClip, useGenerateRegionImages, useInvalidateClip } from '../../../../hooks/useCharacters';
import { AdminContent } from '@/components/ui/admin-content';
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
  const invalidateClip = useInvalidateClip(id);

  if (isLoading) {
    return (
      <AdminContent size="narrow">
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </AdminContent>
    );
  }

  if (error || !clip) {
    return (
      <AdminContent size="narrow">
        <Link href="/admin/personnages" className="text-sm text-muted-foreground hover:text-foreground">
          ← Personnages
        </Link>
        <p className="mt-4 text-sm text-destructive">
          {error instanceof Error ? error.message : 'Clip introuvable.'}
        </p>
      </AdminContent>
    );
  }

  return (
    <AdminContent size="narrow">
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
          onRegionImagesComplete={invalidateClip}
          isSavingRegions={updateClipMutation.isPending}
          isTrimming={trimClipMutation.isPending}
          isGeneratingRegionImages={generateRegionImagesMutation.isPending}
        />
        <ClipDetailActions clip={clip} />
      </div>
    </AdminContent>
  );
}
