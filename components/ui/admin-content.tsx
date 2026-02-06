import * as React from 'react';
import { cn } from '@/lib/utils';

const sizeClasses = {
  default: 'max-w-6xl',
  narrow: 'max-w-5xl',
} as const;

interface AdminContentProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: keyof typeof sizeClasses;
}

const AdminContent = React.forwardRef<HTMLDivElement, AdminContentProps>(
  ({ className, size = 'default', ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mx-auto px-6 py-10',
        sizeClasses[size],
        className
      )}
      {...props}
    />
  )
);
AdminContent.displayName = 'AdminContent';

export { AdminContent };
