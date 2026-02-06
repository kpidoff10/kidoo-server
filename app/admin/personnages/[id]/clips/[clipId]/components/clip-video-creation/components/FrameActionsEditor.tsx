'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FrameAction, VibrationEffect } from '../../../../../../../types/emotion-video';

const VIBRATION_EFFECTS: { value: VibrationEffect; label: string }[] = [
  { value: 'short', label: 'Court' },
  { value: 'long', label: 'Long' },
  { value: 'saccade', label: 'Saccadé' },
  { value: 'pulse', label: 'Pulsation' },
  { value: 'double', label: 'Double tap' },
];

interface FrameActionsEditorProps {
  actions: FrameAction[];
  onChange: (actions: FrameAction[]) => void;
}

export function FrameActionsEditor({ actions, onChange }: FrameActionsEditorProps) {
  const [newLedColor, setNewLedColor] = useState('#ff0000');

  const addVibration = (effect: VibrationEffect) => {
    onChange([...actions, { type: 'vibration', effect }]);
  };

  const addLed = (color: string) => {
    onChange([...actions, { type: 'led', color }]);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const updateLedColor = (index: number, color: string) => {
    const updated = [...actions];
    const a = updated[index];
    if (a && a.type === 'led') {
      updated[index] = { type: 'led', color };
      onChange(updated);
    }
  };

  const updateVibrationEffect = (index: number, effect: VibrationEffect) => {
    const updated = [...actions];
    const a = updated[index];
    if (a && a.type === 'vibration') {
      updated[index] = { ...a, effect };
      onChange(updated);
    }
  };

  return (
    <div className="space-y-3">
      <Label className="text-xs font-medium">Actions (ESP32)</Label>

      {/* Ajouter une action */}
      <div className="flex flex-wrap gap-2">
        <span className="text-[10px] text-muted-foreground self-center">Ajouter :</span>
        {VIBRATION_EFFECTS.map(({ value, label }) => (
          <Button
            key={value}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => addVibration(value)}
          >
            📳 {label}
          </Button>
        ))}
        <div className="flex items-center gap-1">
          <Input
            type="color"
            className="h-7 w-9 cursor-pointer p-0.5 border"
            value={newLedColor}
            onChange={(e) => setNewLedColor(e.target.value)}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => addLed(newLedColor)}
          >
            💡 LED
          </Button>
        </div>
      </div>

      {/* Liste des actions */}
      {actions.length > 0 && (
        <div className="space-y-1.5">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 rounded border border-border/60 bg-muted/20 px-2 py-1.5 text-xs"
            >
              {action.type === 'vibration' ? (
                <>
                  <span className="shrink-0">📳</span>
                  <select
                    value={action.effect ?? 'short'}
                    onChange={(e) => updateVibrationEffect(idx, e.target.value as VibrationEffect)}
                    className="h-6 rounded border border-border bg-background px-1.5 text-[11px]"
                  >
                    {VIBRATION_EFFECTS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <span className="shrink-0">💡</span>
                  <Input
                    type="color"
                    value={action.color}
                    className="h-6 w-8 cursor-pointer p-0.5 border"
                    onChange={(e) => updateLedColor(idx, e.target.value)}
                  />
                  <span className="font-mono text-muted-foreground">{action.color}</span>
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="ml-auto h-5 w-5 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => removeAction(idx)}
                title="Supprimer"
              >
                ×
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
