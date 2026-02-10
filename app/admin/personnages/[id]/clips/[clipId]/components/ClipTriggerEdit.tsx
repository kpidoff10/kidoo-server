'use client';

import { useState } from 'react';
import type { CharacterClipDetail, TriggerType } from '../../../../../lib/charactersApi';
import { TriggerSelector } from './TriggerSelector';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface ClipTriggerEditProps {
  clip: CharacterClipDetail;
  onSave: (data: { trigger: TriggerType; variant: number }) => void;
  isSaving: boolean;
}

export function ClipTriggerEdit({ clip, onSave, isSaving }: ClipTriggerEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [trigger, setTrigger] = useState<TriggerType>(clip.trigger || 'manual');
  const [variant, setVariant] = useState<number>(clip.variant || 1);
  const [hasChanges, setHasChanges] = useState(false);

  const handleTriggerChange = (newTrigger: TriggerType) => {
    setTrigger(newTrigger);
    setHasChanges(
      newTrigger !== (clip.trigger || 'manual') ||
      variant !== (clip.variant || 1)
    );
  };

  const handleVariantChange = (newVariant: string) => {
    const variantNum = parseInt(newVariant, 10);
    setVariant(variantNum);
    setHasChanges(
      trigger !== (clip.trigger || 'manual') ||
      variantNum !== (clip.variant || 1)
    );
  };

  const handleSave = () => {
    onSave({ trigger, variant });
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTrigger(clip.trigger || 'manual');
    setVariant(clip.variant || 1);
    setHasChanges(false);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h3 className="text-sm font-medium text-foreground">Déclencheur automatique</h3>
            <p className="text-xs text-muted-foreground">
              Trigger: <span className="font-mono">{clip.trigger || 'manual'}</span> • Variant: <span className="font-mono">{clip.variant || 1}</span>
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsEditing(true)}
          >
            Modifier
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-4">
      <h3 className="text-sm font-medium text-foreground">Modifier le déclencheur</h3>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="trigger">Trigger</Label>
          <TriggerSelector
            value={trigger}
            onChange={handleTriggerChange}
            disabled={isSaving}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="variant">Variant (1-4)</Label>
          <p className="text-xs text-muted-foreground mb-2">
            Permet plusieurs animations pour le même trigger (ex: biberon=1, gâteau=2, pomme=3, bonbon=4)
          </p>
          <Select
            value={variant.toString()}
            onValueChange={handleVariantChange}
            disabled={isSaving}
          >
            <SelectTrigger id="variant" className="w-full">
              <SelectValue placeholder="Sélectionner un variant" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">Variant 1</SelectItem>
              <SelectItem value="2">Variant 2</SelectItem>
              <SelectItem value="3">Variant 3</SelectItem>
              <SelectItem value="4">Variant 4</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex gap-2 justify-end">
        <Button
          variant="outline"
          onClick={handleCancel}
          disabled={isSaving}
        >
          Annuler
        </Button>
        <Button
          onClick={handleSave}
          disabled={!hasChanges || isSaving}
        >
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
        </Button>
      </div>
    </div>
  );
}
