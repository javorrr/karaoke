import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE } from '../lib/motion.js';

export function Header() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.header
      className="site-header"
      data-testid="site-header"
      initial={reduceMotion ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: DURATION, ease: EASE }}
    >
      <div className="container header-content">
        <a
          className="brand"
          href="./"
          aria-label="karaoke. — strona główna"
          data-testid="brand"
        >
          <span className="brand-word">
            karaoke<span className="brand-dot">.</span>
          </span>
        </a>
        <nav className="header-nav" aria-label="Główna nawigacja">
          <a href="#songs-list">Biblioteka</a>
          <a href="#recommendations">Na dziś</a>
        </nav>
      </div>
    </motion.header>
  );
}
