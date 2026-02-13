import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { FaBriefcase } from 'react-icons/fa';

interface Experience {
  company: string;
  role: string;
  period: string;
  achievements: string[];
}

interface TimelineProps {
  experiences: Experience[];
}

export const Timeline: React.FC<TimelineProps> = ({ experiences }) => {
  return (
    <div className="relative container mx-auto px-6 flex flex-col space-y-8">
      <div className="absolute z-0 w-1 h-full bg-slate-200 dark:bg-slate-800 left-4 md:left-1/2 md:-ml-0.5 transform -translate-x-1/2"></div>
      {experiences.map((exp, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          className={`relative z-10 flex flex-col md:flex-row ${
            index % 2 === 0 ? 'md:flex-row-reverse' : ''
          }`}
        >
          <div className="absolute left-4 md:left-1/2 transform -translate-x-1/2 -translate-y-4 md:translate-y-0 w-8 h-8 bg-blue-500 rounded-full border-4 border-white dark:border-slate-900 flex items-center justify-center">
             <FaBriefcase className="text-white text-xs" />
          </div>
          
          <div className="ml-12 md:ml-0 md:w-1/2 px-4">
             <Card className={`p-6 ${index % 2 === 0 ? 'md:text-left' : 'md:text-right'} hover:border-blue-500/50 transition-colors`}>
                <div className={`flex flex-col ${index % 2 === 0 ? 'md:items-start' : 'md:items-end'}`}>
                   <Badge variant="outline" className="mb-2 w-fit">{exp.period}</Badge>
                   <h3 className="text-xl font-bold text-slate-900 dark:text-white">{exp.role}</h3>
                   <h4 className="text-lg font-medium text-blue-600 dark:text-blue-400 mb-4">{exp.company}</h4>
                </div>
                 <div className="mt-2 text-left">
                    <ul className="list-disc list-inside space-y-2 text-slate-600 dark:text-slate-300">
                      {exp.achievements.map((item, i) => (
                        <li key={i} className="text-sm">{item}</li>
                      ))}
                    </ul>
                 </div>
             </Card>
          </div>
          <div className="md:w-1/2"></div>
        </motion.div>
      ))}
    </div>
  );
};