import { Section } from '../components/ui/Section';
import { ProjectCard } from '../components/ProjectCard';
import projectsData from '../data/projects.json';

export const ProjectsSection = () => {
  return (
    <Section id="projects" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl">
            Featured Projects
          </h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted">
            Public work across distributed systems, AI engineering, and developer tooling.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 md:mt-12 lg:grid-cols-2">
          {projectsData.map((project) => (
            <ProjectCard key={project.title} {...project} />
          ))}
        </div>
      </div>
    </Section>
  );
};
