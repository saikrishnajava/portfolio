import React from 'react';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { Timeline } from '../components/Timeline';
import experienceData from '../data/experience.json';

const education = [
  {
    degree: 'Master of Science, Computer Science',
    school: 'Texas A&M University-Kingsville',
    year: '2017',
  },
  {
    degree: 'Bachelor of Engineering, Computer Science',
    school: 'Rajamahendri Institute of Engineering & Technology',
    year: '2015',
  },
];

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

        <div className="mt-20">
          <h3 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white text-center mb-8">
            Education & Certification
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {education.map((item) => (
              <Card key={item.degree} className="p-6 hover:border-blue-500/50 transition-colors">
                <h4 className="text-lg font-bold text-slate-900 dark:text-white">{item.degree}</h4>
                <p className="text-blue-600 dark:text-blue-400 font-medium mt-1">{item.school}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Graduated {item.year}</p>
              </Card>
            ))}
          </div>
          <p className="text-center text-sm text-slate-600 dark:text-slate-400 mt-6">
            Career Essentials in Software Development — Microsoft and LinkedIn (2024)
          </p>
        </div>
      </div>
    </Section>
  );
};
