'use client';

import { useState } from 'react';
import type { TriggerType } from '../../../../../lib/charactersApi';
import { EMOTION_TRIGGERS, EMOTION_TRIGGER_CATEGORIES, getConditionDescription } from '@kidoo/shared';

export interface TriggerSelectorProps {
  value: TriggerType | null | undefined;
  onChange: (value: TriggerType) => void;
  disabled?: boolean;
}

export function TriggerSelector({ value, onChange, disabled = false }: TriggerSelectorProps) {
  const [selectedValue, setSelectedValue] = useState<TriggerType>(value || 'manual');

  const selectedDef = EMOTION_TRIGGERS.find((t) => t.id === selectedValue);

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
          {EMOTION_TRIGGER_CATEGORIES.map((category) => (
            <optgroup key={category} label={category}>
              {EMOTION_TRIGGERS.filter((t) => t.category === category).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selectedDef && (
        <p className="text-sm text-muted-foreground italic">
          {getConditionDescription(selectedDef.condition)}
        </p>
      )}

      <p className="text-xs text-muted-foreground">
        💡 Plusieurs clips peuvent avoir le même trigger. Le système en choisira un au hasard pour éviter la répétitivité.
      </p>
    </div>
  );
}
