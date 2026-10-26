import { cn } from '@/lib/utils';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonVariantOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
}

/**
 * Class factory so the same visual contract works on <button> and <a>.
 */
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonVariantOptions = {}) {
  return cn(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm border font-medium tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50',
    {
      // text-paper flips with the theme, so it stays legible on both accent shades.
      'border-accent bg-accent text-paper hover:border-accent/85 hover:bg-accent/90': variant === 'primary',
      'border-line bg-surface text-ink hover:border-ink/40 hover:bg-ink/5': variant === 'secondary',
      'border-line bg-transparent text-ink hover:border-ink/50 hover:bg-ink/5': variant === 'outline',
      'border-transparent bg-transparent text-ink hover:bg-ink/5': variant === 'ghost',
      'h-9 px-3 text-sm': size === 'sm',
      'h-11 px-4 text-sm': size === 'md',
      'h-12 px-6 text-base': size === 'lg',
    },
    className,
  );
}
