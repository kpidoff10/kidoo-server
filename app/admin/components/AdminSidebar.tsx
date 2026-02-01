'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '../contexts';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { KIDOO_MODELS } from '@kidoo/shared';

const MENU_ITEMS = [
  { href: '/admin', label: 'Tableau de bord', icon: LayoutDashboard },
] as const;

const FIRMWARE_BASE = '/admin/firmware';

function LayoutDashboard({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    >
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  );
}

function Chip({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    >
      <rect width="16" height="16" x="4" y="4" rx="2" ry="2" />
      <rect width="6" height="6" x="9" y="9" rx="1" />
      <path d="M15 2v2" />
      <path d="M15 20v2" />
      <path d="M2 15h2" />
      <path d="M2 9h2" />
      <path d="M20 15h2" />
      <path d="M20 9h2" />
      <path d="M9 2v2" />
      <path d="M9 20v2" />
    </svg>
  );
}

function ChevronDown({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0 transition-transform', className)}
      aria-hidden
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function LogOut({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('size-4 shrink-0', className)}
      aria-hidden
    >
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" x2="9" y1="12" y2="12" />
    </svg>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const isFirmwarePath = pathname?.startsWith(FIRMWARE_BASE);
  const [isFirmwareExpanded, setIsFirmwareExpanded] = useState(isFirmwarePath);

  useEffect(() => {
    if (isFirmwarePath) setIsFirmwareExpanded(true);
  }, [isFirmwarePath]);

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-border bg-sidebar">
      {/* Header */}
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <LayoutDashboard className="size-4" />
        </div>
        <span className="font-semibold text-foreground">Admin Kidoo</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {MENU_ITEMS.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === '/admin' ? pathname === '/admin' : pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )}
            >
              <Icon className={isActive ? 'text-primary-foreground' : undefined} />
              {label}
            </Link>
          );
        })}

        {/* Menu Firmware avec sous-menus */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsFirmwareExpanded((v) => !v)}
            className={cn(
              'flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              isFirmwarePath
                ? 'bg-primary/10 text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <div className="flex items-center gap-3">
              <Chip className={isFirmwarePath ? 'text-primary' : undefined} />
              Firmware
            </div>
            <ChevronDown
              className={cn('rotate-0', !isFirmwareExpanded && '-rotate-90')}
            />
          </button>
          {isFirmwareExpanded && (
            <div className="ml-4 mt-1 space-y-0.5 border-l border-border pl-3">
              {KIDOO_MODELS.map((model) => {
                const href = `${FIRMWARE_BASE}/${model.id}`;
                const isActive = pathname === href;
                return (
                  <Link
                    key={model.id}
                    href={href}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors',
                      isActive
                        ? 'font-medium text-primary'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {model.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </nav>

      {/* User footer */}
      <div className="border-t border-border p-3">
        <div className="mb-2 rounded-md bg-muted/80 px-3 py-2">
          <p
            className="truncate text-xs text-muted-foreground"
            title={user?.email ?? ''}
          >
            {user?.email}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
          onClick={() => signOut('/admin/login')}
        >
          <LogOut />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
