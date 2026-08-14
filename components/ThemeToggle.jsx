'use client';

import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <button
      onClick={toggleTheme}
      type="button"
      className="relative flex h-10 w-20 items-center justify-between rounded-full bg-slate-300 p-1 shadow-inner transition-colors duration-300 dark:bg-slate-700"
    >
      <span className="flex w-8 justify-center text-lg select-none">🌙</span>
      <span className="flex w-8 justify-center text-lg select-none">☀️</span>

      {/* Tombol Geser */}
      <span
        className={`absolute top-1 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md transition-transform duration-300 ease-out ${
          theme === 'light' ? 'translate-x-10' : 'translate-x-0'
        }`}
      >
        {theme === 'light' ? '☀️' : '🌙'}
      </span>
    </button>
  );
}