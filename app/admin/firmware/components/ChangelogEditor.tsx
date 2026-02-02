'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { MarkdownEditor } from '@/components/markdown';
import { cn } from '@/lib/utils';

export interface ChangelogEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  minRows?: number;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function ChangelogEditor({
  value,
  onChange,
  label = 'Changelog (Markdown)',
  placeholder = '## Nouveautés\n- Correction…\n- Amélioration…',
  minRows = 5,
  className,
  id,
  disabled = false,
}: ChangelogEditorProps) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={id} className="text-sm font-medium">
        {label}
      </Label>
      <MarkdownEditor
        id={id}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        minRows={minRows}
        showTabs
        showToolbar
        disabled={disabled}
      />
    </div>
  );
}
