import { useEffect, useRef, useState } from 'react';
import { HeroSection } from './sections/HeroSection';
import { ImpactSection } from './sections/ImpactSection';
import { SkillsSection } from './sections/SkillsSection';
import { ExperienceSection } from './sections/ExperienceSection';
import { ProjectsSection } from './sections/ProjectsSection';
import { ContactSection } from './sections/ContactSection';
import { useTheme } from './hooks/useTheme';
import { useScrollSpy } from './hooks/useScrollSpy';
import { FaSun, FaMoon, FaBars, FaTimes, FaArrowUp, FaDownload } from 'react-icons/fa';
import { buttonVariants } from './components/ui/Button';

const navItems = [
  { id: 'hero', label: 'Home' },
  { id: 'impact', label: 'Impact' },
  { id: 'skills', label: 'Skills' },
  { id: 'experience', label: 'Experience' },
  { id: 'projects', label: 'Projects' },
  { id: 'contact', label: 'Contact' },
];

const RESUME_HREF = 'Saikrishna_Garikipati_Resume.pdf';

const scrollBehavior = (): ScrollBehavior =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

function App() {
  const { theme, toggleTheme } = useTheme();
  const activeSection = useScrollSpy(navItems.map((item) => item.id));
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const menuToggleRef = useRef<HTMLButtonElement>(null);
  const mobileNavRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const updateBackToTop = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    updateBackToTop();
    window.addEventListener('scroll', updateBackToTop, { passive: true });
    return () => window.removeEventListener('scroll', updateBackToTop);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const closeOnOutsidePress = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setIsMenuOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutsidePress);
    return () => document.removeEventListener('mousedown', closeOnOutsidePress);
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isMenuOpen) return;

    mobileNavRef.current?.querySelector<HTMLAnchorElement>('a[href]')?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      menuToggleRef.current?.focus();
      setIsMenuOpen(false);
    };

    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMenuOpen]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: scrollBehavior() });
  };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>

      <header
        ref={headerRef}
        className="fixed inset-x-0 top-0 z-50 border-b border-line bg-paper"
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <a
            href="#hero"
            className="font-serif text-base font-semibold tracking-tight text-ink sm:text-lg"
          >
            Saikrishna Garikipati
          </a>

          <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
            {navItems.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  aria-current={isActive ? 'location' : undefined}
                  className={`border-b-2 px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'border-accent text-accent'
                      : 'border-transparent text-muted hover:border-line hover:text-ink'
                  }`}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="flex items-center gap-1 sm:gap-2">
            <a
              href={RESUME_HREF}
              download={RESUME_HREF}
              className={buttonVariants({
                variant: 'outline',
                size: 'sm',
                className: 'hidden sm:inline-flex',
              })}
            >
              <FaDownload aria-hidden="true" />
              Résumé
            </a>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'h-11 w-11 px-0',
              })}
            >
              {theme === 'dark' ? (
                <FaSun aria-hidden="true" />
              ) : (
                <FaMoon aria-hidden="true" />
              )}
            </button>

            <button
              ref={menuToggleRef}
              type="button"
              onClick={() => setIsMenuOpen((open) => !open)}
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav"
              aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
              className={buttonVariants({
                variant: 'ghost',
                size: 'sm',
                className: 'h-11 w-11 px-0 lg:hidden',
              })}
            >
              {isMenuOpen ? (
                <FaTimes aria-hidden="true" />
              ) : (
                <FaBars aria-hidden="true" />
              )}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <nav
            ref={mobileNavRef}
            id="mobile-nav"
            aria-label="Mobile"
            className="menu-enter max-h-[calc(100vh-4rem)] overflow-y-auto border-t border-line bg-surface lg:hidden"
          >
            <ul className="mx-auto max-w-6xl px-4 py-2 sm:px-6">
              {navItems.map((item) => (
                <li key={item.id}>
                  <a
                    href={`#${item.id}`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={
                      activeSection === item.id ? 'location' : undefined
                    }
                    className={`flex min-h-[44px] items-center border-b border-line text-sm ${
                      activeSection === item.id ? 'text-accent' : 'text-ink'
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
              <li className="py-3">
                <a
                  href={RESUME_HREF}
                  download={RESUME_HREF}
                  onClick={() => setIsMenuOpen(false)}
                  className={buttonVariants({ variant: 'outline', size: 'sm' })}
                >
                  <FaDownload aria-hidden="true" />
                  Résumé
                </a>
              </li>
            </ul>
          </nav>
        )}
      </header>

      <main id="main-content" tabIndex={-1}>
        <HeroSection />
        <ImpactSection />
        <SkillsSection />
        <ExperienceSection />
        <ProjectsSection />
        <ContactSection />
      </main>

      {showBackToTop && (
        <button
          type="button"
          onClick={scrollToTop}
          aria-label="Back to top"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+0.75rem)] right-4 z-40 hidden h-11 w-11 items-center justify-center rounded-sm border border-line bg-surface text-ink transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-paper md:inline-flex"
        >
          <FaArrowUp aria-hidden="true" />
        </button>
      )}
    </div>
  );
}

export default App;
