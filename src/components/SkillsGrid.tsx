import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface SkillsGridProps {
  skills: Record<string, string[]>;
}

const filterButton =
  'inline-flex min-h-[44px] items-center rounded-sm border px-4 text-sm tracking-tight transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper';

export const SkillsGrid: React.FC<SkillsGridProps> = ({ skills }) => {
  const categories = Object.keys(skills);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const filteredSkills = activeCategory
    ? { [activeCategory]: skills[activeCategory] }
    : skills;

  return (
    <div>
      <div role="group" aria-label="Filter skills by category" className="flex flex-wrap gap-2">
        <button
          type="button"
          aria-pressed={activeCategory === null}
          onClick={() => setActiveCategory(null)}
          className={cn(
            filterButton,
            activeCategory === null
              ? 'border-accent bg-accent text-paper'
              : 'border-line bg-transparent text-muted hover:border-ink/40 hover:text-ink',
          )}
        >
          All
        </button>
        {categories.map((category) => {
          const active = activeCategory === category;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveCategory(active ? null : category)}
              className={cn(
                filterButton,
                active
                  ? 'border-accent bg-accent text-paper'
                  : 'border-line bg-transparent text-muted hover:border-ink/40 hover:text-ink',
              )}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="mt-10 border-b border-line">
        {Object.entries(filteredSkills).map(([category, items]) => (
          <div
            key={category}
            className="grid gap-4 border-t border-line py-6 md:grid-cols-[minmax(0,15rem)_minmax(0,1fr)] md:gap-10 md:py-8"
          >
            <h3 className="font-serif text-lg font-normal tracking-tight text-ink">
              {category}
            </h3>
            <ul className="flex flex-wrap items-start gap-2">
              {items.map((skill) => (
                <li
                  key={skill}
                  className="border border-line px-2.5 py-1 text-sm leading-relaxed text-muted"
                >
                  {skill}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};
