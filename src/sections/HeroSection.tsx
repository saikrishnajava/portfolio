import React, { useState, useEffect } from 'react';
import { Section } from '../components/ui/Section';
import { Button } from '../components/ui/Button';
import { AvatarCard } from '../components/AvatarCard';
import { motion, AnimatePresence } from 'framer-motion';
import { FaDownload, FaArrowRight } from 'react-icons/fa';
import personalData from '../data/personal.json';

const titles = personalData.titles || ["Senior Lead Software Engineer", "Microservices Architect", "Full-Stack Developer"];

export const HeroSection = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % titles.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Section id="hero" className="flex flex-col md:flex-row items-center justify-between min-h-screen pt-24 md:pt-0">
      <div className="flex-1 space-y-6 text-center md:text-left mb-12 md:mb-0">
        <motion.h2 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg md:text-xl font-medium text-blue-600 dark:text-blue-400"
        >
          Hello, I'm
        </motion.h2>
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-4xl md:text-6xl font-bold tracking-tight text-slate-900 dark:text-white"
        >
          {personalData.name}
        </motion.h1>
        
        <div className="h-8 md:h-12 overflow-hidden relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={index}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -40, opacity: 0 }}
              transition={{ duration: 0.5 }}
              className="text-2xl md:text-4xl font-semibold text-slate-600 dark:text-slate-300"
            >
              {titles[index]}
            </motion.div>
          </AnimatePresence>
        </div>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-lg text-slate-600 dark:text-slate-400 max-w-lg mx-auto md:mx-0"
        >
          {personalData.bio}
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4"
        >
          <Button size="lg" onClick={() => document.getElementById('projects')?.scrollIntoView({ behavior: 'smooth' })}>
            View Projects <FaArrowRight className="ml-2" />
          </Button>
          <a href="resume.docx" download="Saikrishna_Garikipati_Resume.docx">
            <Button variant="outline" size="lg">
              Download Resume <FaDownload className="ml-2" />
            </Button>
          </a>
        </motion.div>
      </div>

      <div className="flex-1 flex justify-center md:justify-end">
        <AvatarCard 
          name={personalData.name}
          role={personalData.role}
          avatarUrl="profile.jpg" 
          badges={['Java 21', 'Spring Boot', 'React', 'Kafka', 'AWS']}
        />
      </div>
    </Section>
  );
};