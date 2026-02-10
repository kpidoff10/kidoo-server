'use client';

import { useState } from 'react';
import type { TriggerType } from '../../../../../lib/charactersApi';

export interface TriggerSelectorProps {
  value: TriggerType | null | undefined;
  onChange: (value: TriggerType) => void;
  disabled?: boolean;
}

/**
 * Options pour le sélecteur de trigger
 */
const TRIGGER_OPTIONS: Array<{ value: TriggerType; label: string; description: string; category: string }> = [
  { value: 'manual', label: 'Manuel', description: 'Pas de déclenchement automatique', category: 'Général' },

  // Hunger
  { value: 'hunger_critical', label: 'Faim critique', description: 'Quand la faim est ≤ 10%', category: 'Faim' },
  { value: 'hunger_low', label: "J'ai faim", description: 'Quand la faim est ≤ 20%', category: 'Faim' },
  { value: 'hunger_medium', label: 'Faim moyenne', description: 'Quand la faim est entre 40-60%', category: 'Faim' },
  { value: 'hunger_full', label: 'Rassasié', description: 'Quand la faim est ≥ 90%', category: 'Faim' },

  // Eating
  { value: 'eating_started', label: 'Commence à manger', description: 'Quand un objet de nourriture est utilisé', category: 'Manger' },
  { value: 'eating_in_progress', label: 'En train de manger', description: 'Pendant un effet progressif de nourriture', category: 'Manger' },
  { value: 'eating_finished', label: "J'ai fini de manger", description: 'Quand la faim atteint 100%', category: 'Manger' },

  // Happiness
  { value: 'happiness_low', label: 'Triste', description: 'Quand le bonheur est ≤ 20%', category: 'Bonheur' },
  { value: 'happiness_medium', label: 'Content', description: 'Quand le bonheur est entre 40-60%', category: 'Bonheur' },
  { value: 'happiness_high', label: 'Très heureux', description: 'Quand le bonheur est ≥ 80%', category: 'Bonheur' },

  // Health
  { value: 'health_critical', label: 'Très malade', description: 'Quand la santé est ≤ 20%', category: 'Santé' },
  { value: 'health_low', label: 'Malade', description: 'Quand la santé est ≤ 40%', category: 'Santé' },
  { value: 'health_good', label: 'En bonne santé', description: 'Quand la santé est ≥ 80%', category: 'Santé' },

  // Fatigue
  { value: 'fatigue_high', label: 'Très fatigué', description: 'Quand la fatigue est ≥ 80%', category: 'Fatigue' },
  { value: 'fatigue_low', label: 'Bien reposé', description: 'Quand la fatigue est ≤ 20%', category: 'Fatigue' },

  // Hygiene
  { value: 'hygiene_low', label: 'Sale', description: 'Quand la propreté est ≤ 20%', category: 'Hygiène' },
  { value: 'hygiene_good', label: 'Propre', description: 'Quand la propreté est ≥ 80%', category: 'Hygiène' },
];

// Grouper les options par catégorie
const CATEGORIES = [
  'Général',
  'Faim',
  'Manger',
  'Bonheur',
  'Santé',
  'Fatigue',
  'Hygiène',
];

export function TriggerSelector({ value, onChange, disabled = false }: TriggerSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<TriggerType>(value || 'manual');

  const selectedOption = TRIGGER_OPTIONS.find((opt) => opt.value === selectedValue);

  const handleChange = (newValue: TriggerType) => {
    setSelectedValue(newValue);
    onChange(newValue);
  };

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="trigger-select" className="block text-sm font-medium text-foreground mb-2">
          Déclencheur automatique
        </label>
        <select
          id="trigger-select"
          value={selectedValue}
          onChange={(e) => handleChange(e.target.value as TriggerType)}
          disabled={disabled}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          {CATEGORIES.map((category) => (
            <optgroup key={category} label={category}>
              {TRIGGER_OPTIONS
                .filter((opt) => opt.category === category)
                .map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selectedOption && (
        <p className="text-sm text-muted-foreground italic">
          {selectedOption.description}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Plusieurs clips peuvent avoir le même trigger. Le système en choisira un au hasard pour éviter la répétitivité.
      </p>
    </div>
  );
}
