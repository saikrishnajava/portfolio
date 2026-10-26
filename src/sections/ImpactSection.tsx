import { Section } from '../components/ui/Section';
import metricsData from '../data/metrics.json';

export const ImpactSection = () => {
  return (
    <Section
      id="impact"
      className="border-y border-[#2A333D] bg-[#101418] text-[#F7F6F2]"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] md:items-end md:gap-12">
          <div>
            <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight md:text-4xl">
              Impact &amp; Metrics
            </h2>
          </div>
          <p className="text-sm leading-relaxed text-[#F7F6F2]/70">
            Production outcomes for deployment, API latency, incident recovery, and
            transaction throughput.
          </p>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-px border-y border-[#F7F6F2]/15 bg-[#F7F6F2]/15 sm:grid-cols-2 lg:mt-12 lg:grid-cols-4">
          {metricsData.map((metric) => (
            <div key={metric.label} className="bg-[#101418] p-6 lg:p-7">
              <p
                data-metric-value
                data-value={String(metric.value)}
                className="font-serif text-5xl leading-none tracking-tight tabular-nums text-[#7AA2FF] md:text-6xl"
              >
                {metric.value}
                {metric.suffix}
              </p>
              <h3 className="mt-4 text-base font-medium text-[#F7F6F2]">{metric.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#F7F6F2]/70">
                {metric.description}
              </p>
              <p className="mt-4 text-xs text-[#F7F6F2]/60">
                {metric.context}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
};
