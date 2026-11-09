import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from 'motion/react';

const STORAGE_KEY = 'karaoke:theme';
const MODE_STORAGE_KEY = 'karaoke:mode';
const MODE_SWITCH_ID = 'mode-switch';
const MODE_EVENT = 'karaoke:mode-change';


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

const readMode = () => {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light';
};

const subscribeMode = (onChange) => {
  if (typeof document === 'undefined') return () => {};

  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-mode'],
  });
  window.addEventListener(MODE_EVENT, onChange);

  return () => {
    observer.disconnect();
    window.removeEventListener(MODE_EVENT, onChange);
  };
};

const storeMode = (value) => {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, value);
  } catch {
    // Preferencje mogą być zablokowane w trybie prywatnym.
  }
};

const applyDocumentMode = (value) => {
  document.documentElement.dataset.mode = value;

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.setAttribute('content', value === 'dark' ? '#121214' : '#F7F6F2');
  }

  window.dispatchEvent(new Event(MODE_EVENT));
};

export function ThemeSwitcher() {
  const [theme, setTheme] = useState(readTheme);
  const mode = useSyncExternalStore(subscribeMode, readMode, () => 'light');
  const reduceMotion = useReducedMotion();
  const optionsRef = useRef([]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event.key !== MODE_STORAGE_KEY) return;

      const nextMode = event.newValue === 'dark' ? 'dark' : 'light';
      if (nextMode !== readMode()) applyDocumentMode(nextMode);
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const applyMode = (nextMode, event) => {
    if (nextMode === readMode()) return;

    storeMode(nextMode);

    const root = document.documentElement;
    const rect =
      event?.currentTarget?.getBoundingClientRect() ??
      document.getElementById(MODE_SWITCH_ID)?.getBoundingClientRect();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;

    root.style.setProperty('--reveal-x', `${x}px`);
    root.style.setProperty('--reveal-y', `${y}px`);

    if (reduceMotion || typeof document.startViewTransition !== 'function') {
      applyDocumentMode(nextMode);
      return;
    }

    let applied = false;

    root.classList.add('theme-reveal');

    try {
      const transition = document.startViewTransition(() => {
        applied = true;
        flushSync(() => applyDocumentMode(nextMode));
      });

      transition.finished.finally(() => {
        root.classList.remove('theme-reveal');
      });
    } catch {
      root.classList.remove('theme-reveal');
      if (!applied) applyDocumentMode(nextMode);
    }
  };

  const handleModeKeyDown = (event) => {
    if (
      event.key === 'Enter' ||
      event.key === 'ArrowRight' ||
      event.key === 'ArrowLeft' ||
      event.key === 'ArrowUp' ||
      event.key === 'ArrowDown'
    ) {
      event.preventDefault();
      applyMode(mode === 'light' ? 'dark' : 'light', event);
    }
  };

  const toggleMode = (event) => {
    applyMode(event.target.checked ? 'dark' : 'light', event);
  };


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
    <div className="theme-switcher" data-testid="theme-switcher">
      <div
        className="theme-presets"
        role="radiogroup"
        aria-label="Motyw kolorystyczny"
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

      <label className="mode-switch" htmlFor={MODE_SWITCH_ID}>
        <span className="mode-switch__toggle-wrap">
          <input
            id={MODE_SWITCH_ID}
            className="mode-switch__toggle"
            type="checkbox"
            role="switch"
            name="mode"
            value="dark"
            aria-checked={mode === 'dark'}
            aria-label="Tryb ciemny"
            title="Tryb ciemny"
            data-testid="theme-mode"
            checked={mode === 'dark'}
            onChange={toggleMode}
            onKeyDown={handleModeKeyDown}
          />
          <span className="mode-switch__icon" aria-hidden="true">
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
            <span className="mode-switch__icon-part" />
          </span>
        </span>
      </label>
    </div>
  );
}
