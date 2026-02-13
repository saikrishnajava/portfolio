import React from 'react';
import { Section } from '../components/ui/Section';
import { Card } from '../components/ui/Card';
import CountUp from 'react-countup';
import { useInView } from '../hooks/useInView';
import metricsData from '../data/metrics.json';

export const ImpactSection = () => {
  const [ref, inView] = useInView({
    triggerOnce: true,
    threshold: 0.1,
  });

  return (
    <Section id="impact" className="bg-slate-50 dark:bg-slate-900/50">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white mb-4">Impact & Metrics</h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Quantifiable achievements delivering value and performance.
          </p>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsData.map((metric, index) => (
            <Card key={index} className="p-6 text-center border-none shadow-lg hover:-translate-y-1 transition-transform duration-300">
              <div className="text-4xl md:text-5xl font-bold text-blue-600 dark:text-blue-500 mb-2">
                {metric.prefix}
                {inView ? (
                  <CountUp 
                    start={0} 
                    end={metric.value} 
                    duration={2.5} 
                    decimals={metric.value % 1 !== 0 ? 2 : 0}
                  />
                ) : (
                  0
                )}
                {metric.suffix}
              </div>
              <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">{metric.label}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{metric.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </Section>
  );
};