import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from 'motion/react';

const STORAGE_KEY = 'karaoke:theme';

const THEMES = [
  { id: 'signal', label: 'Sygnał', swatch: '#c8342a' },
  { id: 'jade', label: 'Jadeit', swatch: '#0e7a5f' },
  { id: 'cobalt', label: 'Kobalt', swatch: '#3a4fc4' },
];

const isTheme = (value) => THEMES.some((theme) => theme.id === value);

const readTheme = () => {
  if (typeof document === 'undefined') return 'signal';
  const value = document.documentElement.dataset.theme;
  return isTheme(value) ? value : 'signal';
};

const storeTheme = (value) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Preferencje mogą być zablokowane w trybie prywatnym.
  }
};

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(readTheme);
  const reduceMotion = useReducedMotion();
  const optionsRef = useRef([]);

  const applyTheme = (nextTheme) => {
    document.documentElement.dataset.theme = nextTheme;
    setTheme(nextTheme);
    storeTheme(nextTheme);
  };

  const chooseTheme = (nextTheme, event) => {
    if (nextTheme === theme) return;

    const root = document.documentElement;
    const rect = event?.currentTarget?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    root.style.setProperty('--reveal-x', `${x}px`);
    root.style.setProperty('--reveal-y', `${y}px`);

    if (reduceMotion || typeof document.startViewTransition !== 'function') {
      applyTheme(nextTheme);
      return;
    }

    let applied = false;

    root.classList.add('theme-reveal');

    try {
      const transition = document.startViewTransition(() => {
        applied = true;
        flushSync(() => applyTheme(nextTheme));
      });

      transition.finished.finally(() => {
        root.classList.remove('theme-reveal');
      });
    } catch {
      root.classList.remove('theme-reveal');
      if (!applied) applyTheme(nextTheme);
    }
  };

  const handleKeyDown = (event) => {
    const currentIndex = THEMES.findIndex((item) => item.id === theme);
    let nextIndex = currentIndex;

    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
      nextIndex = (currentIndex + 1) % THEMES.length;
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
      nextIndex = (currentIndex - 1 + THEMES.length) % THEMES.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = THEMES.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    chooseTheme(THEMES[nextIndex].id, event);
    window.requestAnimationFrame(() => optionsRef.current[nextIndex]?.focus());
  };

  return (
    <div
      className="theme-switcher"
      role="radiogroup"
      aria-label="Motyw kolorystyczny"
      data-testid="theme-switcher"
    >
      {THEMES.map((item, index) => (
        <button
          className="theme-option"
          type="button"
          role="radio"
          aria-checked={theme === item.id}
          aria-label={`Motyw: ${item.label}`}
          title={`Motyw: ${item.label}`}
          data-testid={`theme-${item.id}`}
          key={item.id}
          ref={(element) => {
            optionsRef.current[index] = element;
          }}
          tabIndex={theme === item.id ? 0 : -1}
          onClick={(event) => chooseTheme(item.id, event)}
          onKeyDown={handleKeyDown}
        >
          <span
            className="theme-swatch"
            style={{ '--swatch': item.swatch }}
            aria-hidden="true"
          />
        </button>
      ))}
    </div>
  );
}
