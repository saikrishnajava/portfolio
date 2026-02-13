import React from 'react';
import { cn } from '../../utils/cn';

export const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'rounded-xl border border-slate-200 bg-white text-slate-950 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 dark:text-slate-50',
        className
      )}
      {...props}
    />
  )
);
Card.displayName = 'Card';