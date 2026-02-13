import { useEffect, useState, useRef, RefObject } from 'react';

export function useInView(options?: IntersectionObserverInit & { triggerOnce?: boolean }): [RefObject<HTMLDivElement>, boolean] {
  const ref = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(false);
  const { triggerOnce = true, ...observerOptions } = options || {};

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsInView(true);
        if (triggerOnce) {
          observer.unobserve(element);
        }
      } else if (!triggerOnce) {
        setIsInView(false);
      }
    }, observerOptions);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [observerOptions, triggerOnce]);

  return [ref, isInView];
}