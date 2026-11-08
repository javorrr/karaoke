import { motion, useReducedMotion } from 'motion/react';
import { DURATION, EASE, STAGGER } from '../lib/motion.js';

const list = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION, ease: EASE },
  },
};

export function SongList({ songs, isLoading, onSelect }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      id="songs-list"
      className="songs-list"
      aria-live="polite"
      aria-busy={isLoading}
      data-testid="songs-list"
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={list}
    >
      {songs.map((song) => (
        <motion.article className="song-row" key={song.id} variants={item}>
          <div className="song-info">
            <h3 className="song-title">{song.title}</h3>
            <p className="song-artist">{song.artist}</p>
          </div>
          <button
            className="sing-button"
            type="button"
            aria-label={`Śpiewaj: ${song.title} - ${song.artist}`}
            onClick={() => onSelect(song)}
          >
            Śpiewaj
          </button>
        </motion.article>
      ))}
    </motion.div>
  );
}
