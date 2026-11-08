import { useEffect, useRef } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE, STAGGER } from '../lib/motion.js';

const phraseVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION, ease: EASE },
  },
};

export function Lyrics({
  activeIndex,
  follow,
  onSeek,
  phrases,
  status,
}) {
  const displayRef = useRef(null);
  const lineRefs = useRef([]);
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    if (!follow || activeIndex < 0) return;

    const display = displayRef.current;
    const line = lineRefs.current[activeIndex];

    if (!display || !line) return;

    const displayRect = display.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const target =
      display.scrollTop +
      (lineRect.top - displayRect.top) -
      (display.clientHeight - lineRect.height) / 2;

    display.scrollTo({
      top: Math.max(0, target),
      behavior: reduceMotion ? 'auto' : 'smooth',
    });
  }, [activeIndex, follow, phrases, reduceMotion]);

  const seekFromLine = (line) => {
    if (Number.isFinite(line.time)) {
      onSeek(line.time);
    }
  };

  const handleKeyDown = (event, line) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      seekFromLine(line);
    }
  };

  return (
    <div
      id="lyrics-display"
      aria-live="polite"
      data-testid="lyrics-display"
      ref={displayRef}
    >
      {status === 'error' && 'Nie udało się pobrać tekstu.'}
      {status === 'empty' && 'Brak zsynchronizowanego tekstu.'}
      {status === 'ready' && (
        <motion.div
          initial={reduceMotion ? false : 'hidden'}
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: STAGGER } },
          }}
        >
          {phrases.map((phrase, phraseIndex) => (
            <motion.div
              className="lyrics-phrase"
              key={`${phrase[0]?.index ?? phraseIndex}-${phraseIndex}`}
              variants={phraseVariants}
            >
              {phrase.map((line) => {
                const isActive = line.index === activeIndex;
                const isTimed = Number.isFinite(line.time);

                return (
                  <span
                    className={`lyrics-line${isActive ? ' active' : ''}`}
                    key={line.index}
                    role={isTimed ? 'button' : undefined}
                    tabIndex={isTimed ? 0 : undefined}
                    data-time={isTimed ? String(line.time) : undefined}
                    aria-label={isTimed ? `Przewiń do: ${line.text}` : undefined}
                    aria-current={isActive ? 'true' : undefined}
                    onClick={() => seekFromLine(line)}
                    onKeyDown={(event) => handleKeyDown(event, line)}
                    ref={(element) => {
                      lineRefs.current[line.index] = element;
                    }}
                  >
                    {line.text}{' '}
                  </span>
                );
              })}
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  );
}
