import { Section } from '../components/ui/Section';
import personalData from '../data/personal.json';

const PHONE_DIGITS = personalData.phone.replace(/\D/g, '');
const PHONE_HREF = `tel:+1${PHONE_DIGITS}`;

const textLink =
  'inline-block py-1 text-ink underline decoration-line underline-offset-4 transition-colors hover:text-accent hover:decoration-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper';

export const ContactSection = () => {
  return (
    <Section id="contact" className="border-t border-line pb-24 md:pb-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6" data-contact-content>
        <h2 className="max-w-[24ch] font-serif text-3xl font-normal leading-tight tracking-tight text-ink md:text-5xl">
          Let&rsquo;s talk about systems that hold up.
        </h2>
        <p className="mt-5 max-w-[52ch] text-base leading-relaxed text-muted">
          Open to conversations about distributed platforms, architecture leadership, and
          AI-augmented engineering.
        </p>

        <div className="mt-12 grid gap-10 border-t border-line pt-10 md:mt-16 md:grid-cols-2 md:gap-16 md:pt-12">
          <dl className="space-y-8">
            <div>
              <dt className="text-sm text-muted">Email</dt>
              <dd className="mt-1">
                <a
                  href={`mailto:${personalData.email}`}
                  className={`break-words font-serif text-xl md:text-2xl ${textLink}`}
                >
                  {personalData.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Phone</dt>
              <dd className="mt-1">
                <a
                  href={PHONE_HREF}
                  className={`font-serif text-xl md:text-2xl ${textLink}`}
                >
                  {personalData.phone}
                </a>
              </dd>
            </div>
          </dl>

          <dl className="space-y-8">
            <div>
              <dt className="text-sm text-muted">Location</dt>
              <dd className="mt-1">
                <address className="not-italic text-ink">{personalData.location}</address>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Elsewhere</dt>
              <dd className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
                <a
                  href={personalData.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="LinkedIn profile (opens in a new tab)"
                  className={textLink}
                >
                  LinkedIn
                </a>
                <a
                  href={personalData.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="GitHub profile (opens in a new tab)"
                  className={textLink}
                >
                  GitHub
                </a>
              </dd>
            </div>
          </dl>
        </div>

        <footer className="mt-16 border-t border-line pt-6 md:mt-20">
          <p className="text-xs text-muted">
            Built with React 18, TypeScript, Vite &amp; Tailwind by {personalData.name}
          </p>
        </footer>
      </div>
    </Section>
  );
};
