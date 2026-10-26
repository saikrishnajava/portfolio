import React from 'react';
import { cn } from '@/lib/utils';

interface SectionProps extends React.HTMLAttributes<HTMLElement> {
  id: string;
  className?: string;
  children: React.ReactNode;
}

export const Section: React.FC<SectionProps> = ({ id, className, children, ...props }) => {
  return (
    <section id={id} className={cn('scroll-mt-24 py-14 md:py-20', className)} {...props}>
      {children}
    </section>
  );
};
