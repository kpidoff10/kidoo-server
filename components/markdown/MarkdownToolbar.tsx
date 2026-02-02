'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MarkdownToolbarAction {
  label: string;
  icon?: React.ReactNode;
  /** Snippet à insérer. Utiliser {{cursor}} pour la position du curseur après insertion. */
  snippet: string;
}

const DEFAULT_ACTIONS: MarkdownToolbarAction[] = [
  { label: 'Gras', snippet: '**{{cursor}}**' },
  { label: 'Italique', snippet: '*{{cursor}}*' },
  { label: 'Code', snippet: '`{{cursor}}`' },
  { label: 'Lien', snippet: '[texte]({{cursor}})' },
  { label: 'Liste', snippet: '- {{cursor}}\n' },
  { label: 'Titre', snippet: '## {{cursor}}\n' },
  { label: 'Citation', snippet: '> {{cursor}}\n' },
];

export interface MarkdownToolbarProps {
  onInsert: (text: string, cursorOffset: number) => void;
  actions?: MarkdownToolbarAction[];
  className?: string;
}

export function MarkdownToolbar({
  onInsert,
  actions = DEFAULT_ACTIONS,
  className,
}: MarkdownToolbarProps) {
  const handleClick = (action: MarkdownToolbarAction) => {
    const cursor = '{{cursor}}';
    const idx = action.snippet.indexOf(cursor);
    const text = action.snippet.replace(cursor, '');
    const cursorOffset = idx === -1 ? text.length : idx;
    onInsert(text, cursorOffset);
  };

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-1 rounded-t-md border border-b-0 border-border bg-muted/50 px-2 py-1.5',
        className
      )}
      role="toolbar"
      aria-label="Formatage Markdown"
    >
      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-medium text-muted-foreground hover:text-foreground"
          onClick={() => handleClick(action)}
          title={action.label}
        >
          {action.icon ?? action.label}
        </Button>
      ))}
    </div>
  );
}
