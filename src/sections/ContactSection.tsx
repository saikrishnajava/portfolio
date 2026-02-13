import React from 'react';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import { FaEnvelope, FaLinkedin, FaGithub, FaMapMarkerAlt } from 'react-icons/fa';
import personalData from '../data/personal.json';

export const ContactSection = () => {
  return (
    <Section id="contact" className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-6 text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-8">Get In Touch</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-12 max-w-xl mx-auto">
          I'm always open to discussing new opportunities, innovative projects, or just connecting with fellow engineers.
        </p>

        <div className="flex flex-col md:flex-row justify-center gap-8 mb-16">
          <Card className="p-6 flex flex-col items-center w-full md:w-64 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FaEnvelope size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">Email</h3>
            <a href={`mailto:${personalData.email}`} className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              {personalData.email}
            </a>
          </Card>

          <Card className="p-6 flex flex-col items-center w-full md:w-64 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FaLinkedin size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">LinkedIn</h3>
            <a href={personalData.linkedin} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              Connect on LinkedIn
            </a>
          </Card>

          <Card className="p-6 flex flex-col items-center w-full md:w-64 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FaGithub size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">GitHub</h3>
            <a href={personalData.github} target="_blank" rel="noopener noreferrer" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm">
              View Profile
            </a>
          </Card>
          
           <Card className="p-6 flex flex-col items-center w-full md:w-64 hover:border-blue-500 transition-colors">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <FaMapMarkerAlt size={24} />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-slate-900 dark:text-white">Location</h3>
            <span className="text-slate-600 dark:text-slate-400 text-sm">
              {personalData.location}
            </span>
          </Card>
        </div>

        <footer className="border-t border-slate-200 dark:border-slate-800 pt-8">
          <p className="text-slate-500 dark:text-slate-500 text-sm">
            Built with React 18, TypeScript, Vite & Tailwind by {personalData.name}
          </p>
        </footer>
      </div>
    </Section>
  );
};