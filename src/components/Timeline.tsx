import React from 'react';

interface Experience {
  company: string;
  role: string;
  location: string;
  period: string;
  achievements: string[];
  tech: string[];
}

interface TimelineProps {
  experiences: Experience[];
}

export const Timeline: React.FC<TimelineProps> = ({ experiences }) => {
  return (
    <ol className="border-b border-line">
      {experiences.map((experience) => (
        <li
          key={`${experience.company}-${experience.period}`}
          className="grid gap-4 border-t border-line py-8 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-12 md:py-10"
        >
          <div>
            <p className="text-xs font-medium tabular-nums text-muted">
              {experience.period}
            </p>
            <p className="mt-2 font-serif text-lg leading-snug text-ink">
              {experience.company}
            </p>
            <p className="mt-1 text-sm text-muted">{experience.location}</p>
          </div>

          <div>
            <h3 className="font-serif text-xl font-normal leading-snug tracking-tight text-ink md:text-2xl">
              {experience.role}
            </h3>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted">
              {experience.achievements.map((achievement) => (
                <li key={achievement}>{achievement}</li>
              ))}
            </ul>
            <ul
              aria-label={`Technologies used at ${experience.company}`}
              className="mt-5 flex flex-wrap gap-2"
            >
              {experience.tech.map((technology) => (
                <li
                  key={technology}
                  className="border border-line px-2 py-0.5 text-xs tracking-wide text-muted"
                >
                  {technology}
                </li>
              ))}
            </ul>
          </div>
        </li>
      ))}
    </ol>
  );
};
