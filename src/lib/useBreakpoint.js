'use client';

import { useEffect, useState } from 'react';

// Figma breakpoints: desktop ≥1280 · tablet 768–1279 · mobile <768.
const QUERIES = { desktop: '(min-width: 1280px)', tablet: '(min-width: 768px)' };

function current() {
  if (window.matchMedia(QUERIES.desktop).matches) return 'desktop';
  if (window.matchMedia(QUERIES.tablet).matches) return 'tablet';
  return 'mobile';
}

/** Returns null until mounted (avoids a hydration mismatch), then 'desktop' | 'tablet' | 'mobile'. */
export default function useBreakpoint() {
  const [bp, setBp] = useState(null);
  useEffect(() => {
    const update = () => setBp(current());
    update();
    const mqs = Object.values(QUERIES).map((q) => window.matchMedia(q));
    mqs.forEach((m) => m.addEventListener('change', update));
    return () => mqs.forEach((m) => m.removeEventListener('change', update));
  }, []);
  return bp;
}
