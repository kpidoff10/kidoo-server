'use client';

import * as React from 'react';
import { MarkdownToolbar } from './MarkdownToolbar';
import { MarkdownPreview } from './MarkdownPreview';
import { cn } from '@/lib/utils';

export type MarkdownEditorMode = 'edit' | 'preview';

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  minRows?: number;
  /** Afficher les onglets Édition / Aperçu (défaut: true) */
  showTabs?: boolean;
  /** Afficher la barre d'outils (défaut: true) */
  showToolbar?: boolean;
  className?: string;
  id?: string;
  disabled?: boolean;
}

export function MarkdownEditor({
  value,
  onChange,
  placeholder = 'Écrire en Markdown…',
  minRows = 4,
  showTabs = true,
  showToolbar = true,
  className,
  id,
  disabled = false,
}: MarkdownEditorProps) {
  const [mode, setMode] = React.useState<MarkdownEditorMode>('edit');
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertAtCursor = React.useCallback((text: string, cursorOffset: number) => {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart;
    const end = el.selectionEnd;
    const before = value.slice(0, start);
    const after = value.slice(end);
    const newValue = before + text + after;
    onChange(newValue);

    const newCursor = start + cursorOffset;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(newCursor, newCursor);
    });
  }, [value, onChange]);

  return (
    <div
      className={cn(
        'flex flex-col',
        showTabs && 'overflow-hidden rounded-md border border-border',
        className
      )}
    >
      {showTabs && (
        <div className="flex border-b border-border bg-muted/30">
          <button
            type="button"
            onClick={() => setMode('edit')}
            className={cn(
              'rounded-tl-md px-3 py-2 text-sm font-medium transition-colors',
              mode === 'edit'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Édition
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={cn(
              'rounded-tr-md px-3 py-2 text-sm font-medium transition-colors',
              mode === 'preview'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            Aperçu
          </button>
        </div>
      )}

      {mode === 'edit' && (
        <>
          {showToolbar && (
            <MarkdownToolbar
              onInsert={insertAtCursor}
              className={showTabs ? 'rounded-t-none border-t-0' : undefined}
            />
          )}
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            rows={minRows}
            className={cn(
              'w-full resize-y border border-border bg-background px-3 py-2 text-sm font-mono ring-offset-background',
              'placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              showTabs ? 'rounded-b-md rounded-t-none border-t-0' : 'rounded-md',
              showToolbar && 'rounded-t-none'
            )}
            spellCheck="true"
            data-1p-ignore
          />
        </>
      )}

      {mode === 'preview' && (
        <MarkdownPreview
          value={value}
          minHeight={`${minRows * 24}px`}
          className={showTabs ? 'rounded-b-md border-t-0' : undefined}
        />
      )}
    </div>
  );
}
