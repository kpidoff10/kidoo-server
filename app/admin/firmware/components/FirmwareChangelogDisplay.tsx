'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { MarkdownPreview } from '@/components/markdown';
import { cn } from '@/lib/utils';

export interface FirmwareChangelogDisplayProps {
  changelog: string | null;
  version: string;
  className?: string;
}

export function FirmwareChangelogDisplay({
  changelog,
  version,
  className,
}: FirmwareChangelogDisplayProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  if (!changelog?.trim()) return null;

  return (
    <div className={cn('mt-2', className)}>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-auto py-1 text-xs text-muted-foreground hover:text-foreground"
        onClick={() => setIsOpen((v) => !v)}
      >
        {isOpen ? 'Masquer le changelog' : 'Voir le changelog'}
      </Button>
      {isOpen && (
        <div className="mt-2 rounded-md border border-border bg-muted/20 p-3">
          <MarkdownPreview value={changelog} minHeight="80px" />
        </div>
      )}
    </div>
  );
}
