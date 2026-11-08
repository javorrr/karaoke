import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE, STAGGER } from '../lib/motion.js';

const container = {
  hidden: {},
  visible: {
    transition: { delayChildren: 0.06, staggerChildren: STAGGER },
  },
};

const item = {
  hidden: { opacity: 0, y: 14 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION, ease: EASE },
  },
};

export function Hero() {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className="hero-layout"
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={container}
    >
      <div className="intro">
        <motion.p className="eyebrow" variants={item}>
          Karaoke, bez pośpiechu
        </motion.p>
        <motion.h1 id="library-title" variants={item}>
          Twój głos.
          <br />
          <span className="accent">Twój moment.</span>
        </motion.h1>
        <motion.p className="intro-copy" variants={item}>
          Znajdź numer, który brzmi jak Ty. Wciśnij play i przejmij scenę.
        </motion.p>
      </div>
    </motion.div>
  );
}
