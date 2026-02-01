'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { getKidooModel, isKidooModelId } from '@kidoo/shared';
import { useFirmwares, useDeleteFirmware, useCreateFirmware } from '../../hooks/useFirmwares';
import { useFileUpload } from '../../contexts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import type { KidooModelId } from '@kidoo/shared';

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminFirmwareModelPage() {
  const params = useParams();
  const modelId = params.model as string;

  if (!isKidooModelId(modelId)) {
    return (
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-2xl font-bold text-foreground">Modèle inconnu</h1>
        <p className="mt-2 text-muted-foreground">
          Le modèle &quot;{modelId}&quot; n&apos;existe pas.
        </p>
        <Link
          href="/admin"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  const model = getKidooModel(modelId)!;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold text-foreground">
        Firmware – {model.label}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Liste des firmwares disponibles pour le modèle {model.label}.
      </p>

      <FirmwareList modelId={modelId as KidooModelId} modelLabel={model.label} />
    </div>
  );
}

function FirmwareList({ modelId, modelLabel }: { modelId: KidooModelId; modelLabel: string }) {
  const { data: firmwares, isLoading, error } = useFirmwares(modelId);
  const deleteMutation = useDeleteFirmware(modelId);

  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <p className="mt-6 text-destructive">
        Erreur lors du chargement : {error.message}
      </p>
    );
  }

  if (!firmwares?.length) {
    return (
      <>
        <AddFirmwareForm modelId={modelId} />
        <div className="mt-6 rounded-lg border border-dashed border-border bg-muted/30 p-8 text-center">
          <p className="text-muted-foreground">Aucun firmware pour ce modèle.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ajoutez un firmware ci-dessus (URL du binaire après upload).
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <AddFirmwareForm modelId={modelId} />
    <div className="mt-6 space-y-2">
      {firmwares.map((fw) => (
        <div
          key={fw.id}
          className={cn(
            'flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3',
            fw.id.startsWith('temp-') && 'opacity-70'
          )}
        >
          <div>
            <p className="font-medium text-foreground">v{fw.version}</p>
            <p className="text-sm text-muted-foreground">
              {fw.fileName} · {formatBytes(fw.fileSize)} · {formatDate(fw.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              asChild
            >
              <a href={fw.url} target="_blank" rel="noopener noreferrer">
                Télécharger
              </a>
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              disabled={deleteMutation.isPending || fw.id.startsWith('temp-')}
              onClick={() => deleteMutation.mutate(fw.id)}
            >
              Supprimer
            </Button>
          </div>
        </div>
      ))}
    </div>
    </>
  );
}

function AddFirmwareForm({ modelId }: { modelId: KidooModelId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [version, setVersion] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const createMutation = useCreateFirmware(modelId);
  const { uploadFirmware, isUploading, progress, error: uploadError, reset } = useFileUpload();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    try {
      const result = await uploadFirmware(file, modelId, version);
      createMutation.mutate(
        {
          model: modelId,
          version,
          url: result.url,
          path: result.path,
          fileName: result.fileName,
          fileSize: result.fileSize,
        },
        {
          onSuccess: () => {
            setVersion('');
            setFile(null);
            reset();
            setIsOpen(false);
          },
        }
      );
    } catch {
      // Erreur gérée par le provider
    }
  };

  const isBusy = isUploading || createMutation.isPending;

  return (
    <div className="mt-6">
      <Button
        variant="outline"
        size="sm"
        onClick={() => {
          if (isOpen) reset();
          setIsOpen((v) => !v);
        }}
      >
        {isOpen ? 'Annuler' : '+ Ajouter un firmware'}
      </Button>
      {isOpen && (
        <form
          onSubmit={handleSubmit}
          className="mt-4 rounded-lg border border-border bg-card p-4"
        >
          <div className="space-y-4">
            <div>
              <Label htmlFor="version">Version (ex: 1.0.0)</Label>
              <Input
                id="version"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="1.0.0"
                required
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="file">Fichier firmware (.bin)</Label>
              <Input
                id="file"
                type="file"
                accept=".bin,application/octet-stream"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                required
                className="mt-1"
              />
              {file && (
                <p className="mt-1 text-sm text-muted-foreground">
                  {file.name} · {formatBytes(file.size)}
                </p>
              )}
            </div>
          </div>

          {isUploading && (
            <div className="mt-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Envoi vers Cloudflare R2… {progress}%
              </p>
            </div>
          )}

          {(uploadError || createMutation.isError) && (
            <p className="mt-2 text-sm text-destructive">
              {uploadError ?? createMutation.error?.message}
            </p>
          )}

          <Button
            type="submit"
            className="mt-4"
            disabled={isBusy || !file}
          >
            {isBusy ? (isUploading ? 'Envoi…' : 'Ajout…') : 'Ajouter'}
          </Button>
        </form>
      )}
    </div>
  );
}
