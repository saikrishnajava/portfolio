import React from 'react';

interface ProjectCardProps {
  title: string;
  description: string;
  tech: string[];
  link: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({
  title,
  description,
  tech,
  link,
}) => {
  return (
    <a
      data-project-card
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-h-[44px] flex-col rounded-sm border border-line bg-surface p-6 text-ink transition-colors hover:border-accent focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:p-8"
    >
      <div className="flex items-baseline justify-between gap-4">
        <h3 className="font-serif text-xl font-normal leading-snug tracking-tight text-ink transition-colors group-hover:text-accent md:text-2xl">
          {title}
        </h3>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted">{description}</p>

      <ul className="mt-auto flex flex-wrap gap-2 pt-6">
        {tech.map((technology) => (
          <li
            key={technology}
            className="border border-line px-2 py-0.5 text-[11px] tracking-wide text-muted"
          >
            {technology}
          </li>
        ))}
      </ul>

      <span className="mt-4 text-sm text-muted underline-offset-4 group-hover:underline group-focus-visible:underline">
        View repository
      </span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
};
