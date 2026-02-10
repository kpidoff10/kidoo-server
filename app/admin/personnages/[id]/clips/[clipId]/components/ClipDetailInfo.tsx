'use client';

import type { CharacterClipDetail, TriggerType } from '../../../../../lib/charactersApi';

export interface ClipDetailInfoProps {
  clip: CharacterClipDetail;
}

/**
 * Labels pour les triggers automatiques
 */
const TRIGGER_LABELS: Record<TriggerType, string> = {
  manual: 'Manuel (pas de déclenchement auto)',
  hunger_critical: 'Faim critique (≤10%)',
  hunger_low: "J'ai faim (≤20%)",
  hunger_medium: 'Faim moyenne (40-60%)',
  hunger_full: 'Rassasié (≥90%)',
  eating_started: 'Commence à manger',
  eating_in_progress: 'En train de manger',
  eating_finished: "J'ai fini de manger",
  happiness_low: 'Triste (≤20%)',
  happiness_medium: 'Content (40-60%)',
  happiness_high: 'Très heureux (≥80%)',
  health_critical: 'Très malade (≤20%)',
  health_low: 'Malade (≤40%)',
  health_good: 'En bonne santé (≥80%)',
  fatigue_high: 'Très fatigué (≥80%)',
  fatigue_low: 'Bien reposé (≤20%)',
  hygiene_low: 'Sale (≤20%)',
  hygiene_good: 'Propre (≥80%)',
};

function getTriggerLabel(trigger: TriggerType): string {
  return TRIGGER_LABELS[trigger] || trigger;
}

export function ClipDetailInfo({ clip }: ClipDetailInfoProps) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4 text-sm">
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">ID</dt>
          <dd className="font-mono text-foreground">{clip.id}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Émotion</dt>
          <dd className="text-foreground">
            {clip.emotion.key} — {clip.emotion.label}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Statut</dt>
          <dd
            className={
              clip.status === 'READY'
                ? 'text-green-600 dark:text-green-400'
                : clip.status === 'FAILED'
                  ? 'text-destructive'
                  : 'text-muted-foreground'
            }
          >
            {clip.status}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Poids</dt>
          <dd className="text-foreground">{clip.weight}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-muted-foreground">Déclencheur automatique</dt>
          <dd className="text-foreground">
            {clip.trigger ? getTriggerLabel(clip.trigger) : getTriggerLabel('manual')}
          </dd>
          <dd className="text-xs text-muted-foreground mt-1">
            Plusieurs clips peuvent avoir le même trigger. Le système en choisira un au hasard.
          </dd>
        </div>
        {clip.loopStartFrame != null && (
          <div>
            <dt className="text-muted-foreground">Début de boucle</dt>
            <dd className="text-foreground">Frame {clip.loopStartFrame + 1}</dd>
          </div>
        )}
        {clip.loopEndFrame != null && (
          <div>
            <dt className="text-muted-foreground">Fin de boucle</dt>
            <dd className="text-foreground">Frame {clip.loopEndFrame + 1}</dd>
          </div>
        )}
        {clip.prompt && (
          <div className="sm:col-span-2">
            <dt className="text-muted-foreground">Prompt</dt>
            <dd className="text-foreground">{clip.prompt}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}
