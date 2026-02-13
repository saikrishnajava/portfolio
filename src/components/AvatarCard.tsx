import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from './ui/Badge';
import { Card } from './ui/Card';

interface AvatarCardProps {
  name: string;
  role: string;
  avatarUrl: string;
  badges: string[];
}

export const AvatarCard: React.FC<AvatarCardProps> = ({ name, role, avatarUrl, badges }) => {
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative group"
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full opacity-75 group-hover:opacity-100 blur transition duration-1000 group-hover:duration-200"></div>
      <Card className="relative flex flex-col items-center justify-center p-8 text-center rounded-full aspect-square w-80 h-80 md:w-96 md:h-96 mx-auto bg-white dark:bg-slate-900 border-none">
        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-4 border-slate-100 dark:border-slate-800 mb-4 shadow-lg">
          <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold mb-1 text-slate-900 dark:text-white">{name}</h2>
        <p className="text-slate-500 dark:text-slate-400 mb-4">{role}</p>
        <div className="flex flex-wrap justify-center gap-2">
          {badges.map((badge) => (
            <Badge key={badge} variant="secondary" className="bg-slate-100 dark:bg-slate-800">
              {badge}
            </Badge>
          ))}
        </div>
      </Card>
    </motion.div>
  );
};