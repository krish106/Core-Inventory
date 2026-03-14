import { useState, useEffect, useCallback } from 'react';

export default function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === 'undefined') return false;
    const saved = localStorage.getItem('coreinventory-dark');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) { root.classList.add('dark'); } else { root.classList.remove('dark'); }
    localStorage.setItem('coreinventory-dark', String(isDark));
  }, [isDark]);

  const toggleDark = useCallback(() => setIsDark(p => !p), []);
  return { isDark, toggleDark };
}
