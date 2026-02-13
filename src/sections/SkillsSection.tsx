import React from 'react';
import { Section } from '../components/ui/Section';
import { SkillsGrid } from '../components/SkillsGrid';
import skillsData from '../data/skills.json';

export const SkillsSection = () => {
  return (
    <Section id="skills">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Technical Skills</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            A comprehensive toolkit for building scalable, high-performance applications.
          </p>
        </div>
        <SkillsGrid skills={skillsData} />
      </div>
    </Section>
  );
};