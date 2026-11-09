import { useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { DURATION, EASE, STAGGER } from '../lib/motion.js';
import { getCoverStyle, getMonogram, formatSongDuration, durationLabel } from '../lib/cover.js';
import { usePointerGlow } from '../hooks/usePointerGlow.js';

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

export function SongList({
  songs,
  isLoading,
  onSelect,
  activeId,
  isPlaying,
  transitionSongId,
}) {
  const reduceMotion = useReducedMotion();
  const listRef = useRef(null);

  usePointerGlow(listRef);

  const selectedId = activeId ?? null;
  const coversSelected = transitionSongId ?? selectedId;

  const handleSelect = (song, event) => {
    const row = event.currentTarget.closest('.song-row');
    if (row) row.style.viewTransitionName = '';
    onSelect(song);
  };

  return (
    <motion.div
      id="songs-list"
      className="songs-list"
      ref={listRef}
      aria-live="polite"
      aria-busy={isLoading}
      data-testid="songs-list"
      initial={reduceMotion ? false : 'hidden'}
      animate="visible"
      variants={list}
      layout
    >
      {isLoading && songs.length === 0
        ? Array.from({ length: 3 }, (_, index) => (
            <div
              className="song-skeleton"
              key={`song-skeleton-${index}`}
              aria-hidden="true"
            >
              <span className="skeleton-block skeleton-index" />
              <span className="skeleton-block skeleton-cover" />
              <div className="skeleton-info">
                <span className="skeleton-block skeleton-title" />
                <span className="skeleton-block skeleton-artist" />
              </div>
              <span className="skeleton-block skeleton-action" />
            </div>
          ))
        : (
            <AnimatePresence initial={false} mode="popLayout">
              {songs.map((song, index) => {
                const isActive = song.id === selectedId;
                const rowClasses = [
                  'song-row',
                  isActive ? 'is-active' : '',
                  isActive && isPlaying ? 'is-playing' : '',
                ]
                  .filter(Boolean)
                  .join(' ');
                const coverStyle = getCoverStyle(song);
                const selectedCover =
                  song.id === coversSelected
                    ? { ...coverStyle, viewTransitionName: 'song-cover' }
                    : coverStyle;

                return (
                  <motion.article
                    className={rowClasses}
                    key={song.id}
                    variants={item}
                    layout
                    aria-current={isActive ? 'true' : undefined}
                    data-song-id={song.id}
                    data-testid="song-row"
                  >
                    <span className="song-index" aria-hidden="true">
                      <span className="song-index-number">{index + 1}</span>
                      <span className="song-index-play" />
                      <span className="song-equalizer">
                        <i />
                        <i />
                        <i />
                      </span>
                    </span>

                    <div
                      className="song-cover"
                      aria-hidden="true"
                      data-testid="song-cover"
                      style={selectedCover}
                    >
                      <span className="cover-monogram">
                        {getMonogram(song)}
                      </span>
                    </div>

                    <div className="song-info">
                      <h3 className="song-title">{song.title}</h3>
                      <p className="song-artist">{song.artist}</p>
                    </div>

                    <span
                      className="song-duration"
                      aria-label={durationLabel(song.duration)}
                    >
                      {formatSongDuration(song.duration)}
                    </span>

                    <button
                      className="sing-button"
                      type="button"
                      aria-label={`Śpiewaj: ${song.title} - ${song.artist}`}
                      data-testid="sing-button"
                      onClick={(event) => handleSelect(song, event)}
                    >
                      <span className="sing-icon" aria-hidden="true" />
                      <span className="sing-label">Śpiewaj</span>
                    </button>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          )}
    </motion.div>
  );
}
