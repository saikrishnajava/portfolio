import { Section } from '../components/ui/Section';
import { AvatarCard } from '../components/AvatarCard';
import { buttonVariants } from '../components/ui/Button';
import { FaArrowRight, FaDownload } from 'react-icons/fa';
import personalData from '../data/personal.json';

const RESUME_HREF = 'Saikrishna_Garikipati_Resume.pdf';

export const HeroSection = () => {
  return (
    <Section id="hero" className="pt-28 pb-16 md:pt-32 md:pb-24">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-16">
        <div className="lg:col-span-7">
          <p className="hero-enter text-sm text-muted">{personalData.role}</p>

          <h1 className="hero-enter hero-stagger-1 mt-5 font-serif text-[clamp(3rem,8vw,5.5rem)] font-normal leading-[0.95] tracking-[-0.02em] text-ink">
            {personalData.name}
          </h1>

          <p className="hero-enter hero-stagger-2 mt-6 max-w-[62ch] text-base leading-relaxed text-muted md:text-lg">
            {personalData.bio}
          </p>

          <div className="hero-enter hero-stagger-3 mt-9 flex flex-col gap-3 sm:flex-row">
            <a
              href="#projects"
              className={buttonVariants({ size: 'lg', className: 'w-full sm:w-auto' })}
            >
              View selected work
              <FaArrowRight aria-hidden="true" />
            </a>
            <a
              href={RESUME_HREF}
              download={RESUME_HREF}
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'w-full sm:w-auto',
              })}
            >
              <FaDownload aria-hidden="true" />
              Download résumé (PDF)
            </a>
          </div>
        </div>

        <div className="hero-enter hero-stagger-4 lg:col-span-5 lg:justify-self-end">
          <AvatarCard />
        </div>
      </div>
    </Section>
  );
};
