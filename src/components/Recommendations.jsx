import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE, STAGGER } from '../lib/motion.js';

const list = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER },
  },
};

const item = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION, ease: EASE },
  },
};

const playLabel = (count) =>
  `${count} ${count === 1 ? 'śpiewanie' : 'śpiewań'}`;

export function Recommendations({ songs, onSelect }) {
  const reduceMotion = useReducedMotion();

  return (
    <section
      id="recommendations"
      className="recommendations"
      aria-labelledby="recommended-title"
      data-testid="recommendations"
      hidden={songs.length === 0}
    >
      <div className="recommendation-heading">
        <h2 id="recommended-title">Na dziś</h2>
        <p className="recommendation-note">Najczęściej śpiewane</p>
      </div>
      <motion.ol
        className="recommended-list"
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        variants={list}
      >
        {songs.map(({ song, playCount }) => (
          <motion.li className="recommendation-item" key={song.id} variants={item}>
            <button
              className="recommended-song"
              type="button"
              onClick={() => onSelect(song)}
            >
              <span className="recommendation-song-title">{song.title}</span>
              <span className="recommendation-song-artist">{song.artist}</span>
              <span className="recommendation-plays">{playLabel(playCount)}</span>
            </button>
          </motion.li>
        ))}
      </motion.ol>
    </section>
  );
}
