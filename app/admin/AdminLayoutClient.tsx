'use client';

import { AdminGuard } from './AdminGuard';

export function AdminLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
