'use client';

import { useState } from 'react';
import type { CharacterClipDetail, TriggerType } from '../../../../../lib/charactersApi';
import { TriggerSelector } from './TriggerSelector';
import { Button } from '@/components/ui/button';

export interface ClipTriggerEditProps {
  clip: CharacterClipDetail;
  onSave: (data: { trigger: TriggerType }) => void;
  isSaving: boolean;
}

export function ClipTriggerEdit({ clip, onSave, isSaving }: ClipTriggerEditProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [trigger, setTrigger] = useState<TriggerType>(clip.trigger || 'manual');
  const [hasChanges, setHasChanges] = useState(false);

  const handleTriggerChange = (newTrigger: TriggerType) => {
    setTrigger(newTrigger);
    setHasChanges(newTrigger !== (clip.trigger || 'manual'));
  };

  const handleSave = () => {
    onSave({ trigger });
    setHasChanges(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setTrigger(clip.trigger || 'manual');
    setHasChanges(false);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-foreground">Déclencheur automatique</h3>
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

      <TriggerSelector
        value={trigger}
        onChange={handleTriggerChange}
        disabled={isSaving}
      />

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
