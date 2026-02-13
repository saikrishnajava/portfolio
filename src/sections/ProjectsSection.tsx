import React from 'react';
import { Section } from '../components/ui/Section';
import { ProjectCard } from '../components/ProjectCard';
import projectsData from '../data/projects.json';

export const ProjectsSection = () => {
  return (
    <Section id="projects">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Featured Projects</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Showcasing innovation and technical expertise through open source contributions.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {projectsData.map((project, index) => (
            <ProjectCard
              key={index}
              {...project}
            />
          ))}
        </div>
      </div>
    </Section>
  );
};