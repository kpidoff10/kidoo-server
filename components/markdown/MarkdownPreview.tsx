'use client';

import * as React from 'react';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/utils';

export interface MarkdownPreviewProps {
  value: string;
  className?: string;
  /** Hauteur min pour garder une zone cohérente avec l'éditeur */
  minHeight?: string;
}

const emptyPlaceholder = (
  <p className="text-muted-foreground/70 text-sm">Aperçu du Markdown…</p>
);

export function MarkdownPreview({
  value,
  className,
  minHeight = '120px',
}: MarkdownPreviewProps) {
  const isEmpty = !value.trim();

  return (
    <div
      className={cn(
        'overflow-auto rounded-b-md border border-border bg-muted/20 px-3 py-3 text-sm prose prose-sm dark:prose-invert max-w-none',
        'prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0.5 prose-headings:my-2',
        className
      )}
      style={{ minHeight }}
    >
      {isEmpty ? (
        emptyPlaceholder
      ) : (
        <ReactMarkdown
          components={{
            a: ({ href, children }) => (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline hover:no-underline"
              >
                {children}
              </a>
            ),
          }}
        >
          {value}
        </ReactMarkdown>
      )}
    </div>
  );
}
