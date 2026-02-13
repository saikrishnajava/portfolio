import React from 'react';
import { motion } from 'framer-motion';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
import { FaGithub } from 'react-icons/fa';

interface ProjectCardProps {
  title: string;
  description: string;
  tech: string[];
  link: string;
}

export const ProjectCard: React.FC<ProjectCardProps> = ({ title, description, tech, link }) => {
  return (
    <motion.div
      whileHover={{ y: -10 }}
      transition={{ type: 'spring', stiffness: 300 }}
    >
      <Card className="h-full flex flex-col p-6 hover:shadow-xl hover:shadow-blue-500/10 transition-all duration-300 border-t-4 border-t-transparent hover:border-t-blue-500">
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
          <a href={link} target="_blank" rel="noopener noreferrer" className="text-slate-400 hover:text-blue-500 transition-colors">
            <FaGithub size={20} />
          </a>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-6 flex-grow">{description}</p>
        <div className="flex flex-wrap gap-2 mt-auto">
          {tech.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};