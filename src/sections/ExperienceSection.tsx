import React from 'react';
import { Section } from '../components/ui/Section';
import { Timeline } from '../components/Timeline';
import experienceData from '../data/experience.json';

export const ExperienceSection = () => {
  return (
    <Section id="experience" className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Professional Experience</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            My journey through leading tech companies and impactful roles.
          </p>
        </div>
        <Timeline experiences={experienceData} />
      </div>
    </Section>
  );
};