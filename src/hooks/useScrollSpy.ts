import { useEffect, useState } from 'react';

const ROOT_MARGIN = '-45% 0px -50% 0px';

/**
 * Tracks which section is inside a narrow band around the viewport middle.
 * IntersectionObserver only, so no layout reads happen in a scroll handler.
 */
export function useScrollSpy(sectionIds: string[]) {
  const [activeId, setActiveId] = useState('');
  const key = sectionIds.join(',');

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    const elements = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) return;

    // Top edge of every currently intersecting section, viewport-relative.
    const tops = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const id = entry.target.id;
          if (entry.isIntersecting) {
            tops.set(id, entry.boundingClientRect.top);
          } else {
            tops.delete(id);
          }
        }

        let nextId = '';
        let nextTop = Number.POSITIVE_INFINITY;
        for (const [id, top] of tops) {
          if (top < nextTop) {
            nextTop = top;
            nextId = id;
          }
        }

        // At the document edges nothing may intersect; keep the last known section.
        if (nextId) setActiveId(nextId);
      },
      { rootMargin: ROOT_MARGIN, threshold: 0 },
    );

    for (const element of elements) observer.observe(element);

    return () => observer.disconnect();
  }, [key]);

  return activeId;
}
