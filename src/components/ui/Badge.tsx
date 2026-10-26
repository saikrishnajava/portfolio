import React from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant = 'default' | 'secondary' | 'outline' | 'accent';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'default', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          'inline-flex items-center rounded-sm border px-2.5 py-0.5 text-xs font-medium tracking-tight',
          {
            'border-line bg-surface text-ink': variant === 'default',
            'border-line bg-ink/5 text-ink': variant === 'secondary',
            'border-line bg-transparent text-muted': variant === 'outline',
            'border-accent bg-accent/10 text-accent': variant === 'accent',
          },
          className,
        )}
        {...props}
      />
    );
  },
);

Badge.displayName = 'Badge';
