'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useEmotions, useCreateEmotion, useUpdateEmotion, useDeleteEmotion } from '../../hooks/useEmotions';
import { useCharacterClips, useGenerateClip, useSyncClipStatus, useUploadClip } from '../../hooks/useCharacters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { CharacterClip } from '../../lib/charactersApi';
import { getEffectivePreviewUrl } from '../../lib/charactersApi';

interface CharacterEmotionsTabProps {
  characterId: string;
}

export function CharacterEmotionsTab({ characterId }: CharacterEmotionsTabProps) {
  const { data: emotions, isLoading: emotionsLoading } = useEmotions();
  const { data: clips, isLoading: clipsLoading } = useCharacterClips(characterId);
  const createMutation = useCreateEmotion();
  const generateClipMutation = useGenerateClip(characterId);
  const syncClipMutation = useSyncClipStatus(characterId);
  const uploadClipMutation = useUploadClip(characterId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingEmotionKeyRef = useRef<string | null>(null);
  const [newKey, setNewKey] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newPromptCustom, setNewPromptCustom] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editPromptCustom, setEditPromptCustom] = useState('');

  const isLoading = emotionsLoading || clipsLoading;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKey.trim() || !newLabel.trim()) return;
    try {
      await createMutation.mutateAsync({
        key: newKey.trim().toUpperCase().replace(/\s+/g, '_'),
        label: newLabel.trim(),
        promptCustom: newPromptCustom.trim() || null,
      });
      setNewKey('');
      setNewLabel('');
      setNewPromptCustom('');
    } catch {
      // Error shown via mutation
    }
  };

  const handleUploadClipClick = (emotionKey: string) => {
    pendingEmotionKeyRef.current = emotionKey;
    fileInputRef.current?.click();
  };

  const handleUploadClipFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const emotionKey = pendingEmotionKeyRef.current;
    e.target.value = '';
    pendingEmotionKeyRef.current = null;
    if (!file || !emotionKey) return;
    try {
      await uploadClipMutation.mutateAsync({ emotionKey, file });
    } catch {
      // Error shown via mutation
    }
  };

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Chargement…</p>;
  }

  const clipsByEmotionKey = (clips ?? []).reduce<Record<string, CharacterClip[]>>((acc, clip) => {
    const key = clip.emotion.key;
    if (!acc[key]) acc[key] = [];
    acc[key].push(clip);
    return acc;
  }, {});

  const readyCount = (arr: CharacterClip[] | undefined) =>
    arr?.filter((c) => c.status === 'READY').length ?? 0;

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-sm font-semibold text-foreground">Émotions de ce personnage</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          Clés utilisées par le device (HOT, OK, COLD, BRUSH, SLEEP…). Dépliez une émotion pour voir ses clips.
        </p>
        <form onSubmit={handleCreate} className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="min-w-[120px] flex-1 space-y-2">
            <Label htmlFor="emotion-new-key">Clé</Label>
            <Input
              id="emotion-new-key"
              value={newKey}
              onChange={(e) => setNewKey(e.target.value)}
              placeholder="HAPPY"
              className="font-mono uppercase"
            />
          </div>
          <div className="min-w-[160px] flex-1 space-y-2">
            <Label htmlFor="emotion-new-label">Libellé</Label>
            <Input
              id="emotion-new-label"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Content"
            />
          </div>
          <div className="min-w-[200px] flex-1 space-y-2">
            <Label htmlFor="emotion-new-prompt">Prompt personnalisé (optionnel)</Label>
            <Input
              id="emotion-new-prompt"
              value={newPromptCustom}
              onChange={(e) => setNewPromptCustom(e.target.value)}
              placeholder="ex: manger un poulet, zzz pour dormir"
            />
          </div>
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending ? 'Ajout…' : 'Ajouter une émotion'}
          </Button>
        </form>
        {createMutation.isError && (
          <p className="mb-4 text-sm text-destructive">{createMutation.error?.message}</p>
        )}
      </section>

      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,.mp4"
        className="hidden"
        onChange={handleUploadClipFileChange}
      />

      {!emotions?.length ? (
        <p className="text-sm text-muted-foreground">
          Aucune émotion. Ajoutez-en ci‑dessus ou exécutez <code className="rounded bg-muted px-1">npm run db:seed</code> pour les émotions de base.
        </p>
      ) : (
        <Accordion type="multiple" className="w-full rounded-lg border border-border">
          {emotions.map((emotion) => {
            const emotionClips = clipsByEmotionKey[emotion.key] ?? [];
            const ready = readyCount(emotionClips);
            return (
              <AccordionItem key={emotion.id} value={emotion.id} className="px-4">
                <div className="flex flex-wrap items-center justify-between gap-3 py-1">
                  <div className="min-w-0 flex-1">
                    <AccordionTrigger className="w-full hover:no-underline [&[data-state=open]>svg]:rotate-180 [&>svg]:shrink-0">
                      <div className="flex flex-wrap items-center gap-3 py-1">
                        <span className="font-mono font-medium text-foreground">{emotion.key}</span>
                        <span className="text-muted-foreground">{emotion.label}</span>
                        <span className="text-sm text-muted-foreground">
                          ({ready} clip{ready !== 1 ? 's' : ''} READY)
                        </span>
                      </div>
                    </AccordionTrigger>
                  </div>
                  <div className="shrink-0 pr-2" onClick={(e) => e.stopPropagation()}>
                    <EmotionRowButtons
                      emotion={emotion}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      editLabel={editLabel}
                      setEditLabel={setEditLabel}
                      editPromptCustom={editPromptCustom}
                      setEditPromptCustom={setEditPromptCustom}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
                <AccordionContent>
                  <div className="flex flex-col gap-3">
                    {emotion.promptCustom && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Prompt personnalisé :</span> {emotion.promptCustom}
                      </p>
                    )}
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={generateClipMutation.isPending}
                        onClick={() => generateClipMutation.mutate(emotion.key)}
                        title="Génère un clip 3s via xAI (Grok Imagine) pour les tests. Dernière frame = première frame pour la boucle."
                      >
                        {generateClipMutation.isPending && generateClipMutation.variables === emotion.key
                          ? 'Génération…'
                          : 'Générer une variante (IA)'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={uploadClipMutation.isPending}
                        onClick={() => handleUploadClipClick(emotion.key)}
                        title="Ajoute un clip en uploadant un fichier MP4 manuellement."
                      >
                        {uploadClipMutation.isPending && uploadClipMutation.variables?.emotionKey === emotion.key
                          ? 'Upload…'
                          : 'Ajouter un clip manuel (MP4)'}
                      </Button>
                      {generateClipMutation.isError && generateClipMutation.variables === emotion.key && (
                        <span className="text-sm text-destructive">{generateClipMutation.error?.message}</span>
                      )}
                      {uploadClipMutation.isError && uploadClipMutation.variables?.emotionKey === emotion.key && (
                        <span className="text-sm text-destructive">{uploadClipMutation.error?.message}</span>
                      )}
                    </div>
                    {emotionClips.length === 0 ? (
                      <p className="text-sm text-muted-foreground">Aucun clip pour cette émotion.</p>
                    ) : (
                      <ul className="space-y-2">
                        {emotionClips.map((clip) => (
                          <li key={clip.id} className="flex flex-wrap items-center gap-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm">
                            <span
                              className={
                                clip.status === 'READY'
                                  ? 'text-green-600 dark:text-green-400'
                                  : clip.status === 'FAILED'
                                    ? 'text-destructive'
                                    : 'text-muted-foreground'
                              }
                            >
                              {clip.status}
                            </span>
                            {clip.status === 'GENERATING' && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={syncClipMutation.isPending && syncClipMutation.variables === clip.id}
                                onClick={() => syncClipMutation.mutate(clip.id)}
                              >
                                {syncClipMutation.isPending && syncClipMutation.variables === clip.id
                                  ? 'Vérification…'
                                  : 'Vérifier le statut'}
                              </Button>
                            )}
                            {getEffectivePreviewUrl(clip) && (
                              <a
                                href={getEffectivePreviewUrl(clip)!}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                Aperçu
                              </a>
                            )}
                            <Link href={`/admin/personnages/${characterId}/clips/${clip.id}`} className="text-primary hover:underline">
                              Détail
                            </Link>
                            {syncClipMutation.isError && syncClipMutation.variables === clip.id && (
                              <span className="text-destructive">{syncClipMutation.error?.message}</span>
                            )}
                            {syncClipMutation.isSuccess &&
                              syncClipMutation.variables === clip.id &&
                              syncClipMutation.data?.message && (
                                <span className="text-muted-foreground">
                                  {syncClipMutation.data.message}
                                  {syncClipMutation.data.message.includes('Aucun job xAI') &&
                                    ' Générez une nouvelle variante ci-dessus.'}
                                </span>
                              )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </div>
  );
}

function EmotionRowButtons({
  emotion,
  editingId,
  setEditingId,
  editLabel,
  setEditLabel,
  editPromptCustom,
  setEditPromptCustom,
  onClick,
}: {
  emotion: { id: string; key: string; label: string; promptCustom?: string | null };
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  editLabel: string;
  setEditLabel: (v: string) => void;
  editPromptCustom: string;
  setEditPromptCustom: (v: string) => void;
  onClick: (e: React.MouseEvent) => void;
}) {
  const updateMutation = useUpdateEmotion(emotion.id);
  const deleteMutation = useDeleteEmotion();
  const isEditing = editingId === emotion.id;

  const startEdit = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(emotion.id);
    setEditLabel(emotion.label);
    setEditPromptCustom(emotion.promptCustom ?? '');
  };

  const saveEdit = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const labelTrimmed = editLabel.trim();
    const promptTrimmed = editPromptCustom.trim() || null;
    if (labelTrimmed === emotion.label && promptTrimmed === (emotion.promptCustom ?? null)) {
      setEditingId(null);
      return;
    }
    try {
      await updateMutation.mutateAsync({ label: labelTrimmed, promptCustom: promptTrimmed });
      setEditingId(null);
    } catch {
      // error from mutation
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer l'émotion "${emotion.key}" ?`)) return;
    try {
      await deleteMutation.mutateAsync(emotion.id);
    } catch {
      // error from mutation
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2" onClick={onClick}>
      {isEditing ? (
        <>
          <Input
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[200px]"
            placeholder="Libellé"
            autoFocus
          />
          <Input
            value={editPromptCustom}
            onChange={(e) => setEditPromptCustom(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            className="max-w-[220px]"
            placeholder="Prompt personnalisé (optionnel)"
          />
          <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
            Enregistrer
          </Button>
          <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
            Annuler
          </Button>
        </>
      ) : (
        <>
          <Button size="sm" variant="ghost" onClick={startEdit}>
            Modifier
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="text-destructive hover:bg-destructive/10"
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
          >
            Supprimer
          </Button>
        </>
      )}
      {updateMutation.isError && (
        <span className="text-sm text-destructive">{updateMutation.error?.message}</span>
      )}
    </div>
  );
}
