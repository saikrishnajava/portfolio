import { Section } from '../components/ui/Section';
import { SkillsGrid } from '../components/SkillsGrid';
import skillsData from '../data/skills.json';

export const SkillsSection = () => {
  return (
    <Section id="skills" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl">
            Technical Skills
          </h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted">
            A working toolkit for distributed systems, backend platforms, cloud delivery,
            and AI-augmented engineering.
          </p>
        </div>
        <div className="mt-10 md:mt-12">
          <SkillsGrid skills={skillsData} />
        </div>
      </div>
    </Section>
  );
};
