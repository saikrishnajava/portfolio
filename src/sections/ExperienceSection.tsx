import { Section } from '../components/ui/Section';
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

const certification = {
  title: 'Career Essentials in Software Development',
  issuer: 'Microsoft and LinkedIn',
  year: '2024',
};

export const ExperienceSection = () => {
  return (
    <Section id="experience" className="border-t border-line">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-2xl">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl">
            Professional Experience
          </h2>
          <p className="mt-4 max-w-[56ch] text-base leading-relaxed text-muted">
            A decade of building and operating distributed platforms across financial
            services, technology, and healthcare.
          </p>
        </div>

        <div className="mt-10 md:mt-12">
          <Timeline experiences={experienceData} />
        </div>

        <div className="mt-16 md:mt-20">
          <h2 className="font-serif text-3xl font-normal leading-tight tracking-tight text-ink md:text-4xl">
            Education &amp; Certification
          </h2>
          <ul className="mt-6 border-b border-line">
            {education.map((item) => (
              <li
                key={item.degree}
                className="grid gap-1 border-t border-line py-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-12 md:py-6"
              >
                <p className="text-sm tabular-nums text-muted">{item.year}</p>
                <div>
                  <h3 className="font-serif text-lg font-normal text-ink">{item.degree}</h3>
                  <p className="mt-1 text-sm text-muted">{item.school}</p>
                </div>
              </li>
            ))}
            <li className="grid gap-1 border-t border-line py-5 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] md:gap-12 md:py-6">
              <p className="text-sm tabular-nums text-muted">{certification.year}</p>
              <div>
                <h3 className="font-serif text-lg font-normal text-ink">
                  {certification.title}
                </h3>
                <p className="mt-1 text-sm text-muted">{certification.issuer}</p>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </Section>
  );
};
