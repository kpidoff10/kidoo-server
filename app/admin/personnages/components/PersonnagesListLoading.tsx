import { AdminContent } from '@/components/ui/admin-content';

export function PersonnagesListLoading() {
  return (
    <AdminContent>
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    </AdminContent>
  );
}
