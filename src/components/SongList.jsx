import { useEffect, useRef } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'motion/react';
import { STAGGER } from '../lib/motion.js';
import { getCoverStyle, getMonogram, formatSongDuration, durationLabel } from '../lib/cover.js';
import { usePointerGlow } from '../hooks/usePointerGlow.js';
import { useSongDurations } from '../hooks/useSongDurations.js';

const list = {
  hidden: {},
  visible: {
    transition: { staggerChildren: STAGGER },
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
  const { durationFor, requestDuration } = useSongDurations(songs);

  usePointerGlow(listRef);

  useEffect(() => {
    if (reduceMotion) return undefined;

    const root = listRef.current;
    if (!root) return undefined;

    const rows = [...root.querySelectorAll('.song-row[data-revealed="false"]')];
    if (!rows.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.dataset.revealed = 'true';
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }
    );

    rows.forEach((row) => observer.observe(row));

    return () => observer.disconnect();
  }, [reduceMotion, songs]);

  useEffect(() => {
    const root = listRef.current;
    if (!root) return undefined;

    const targets = [...root.querySelectorAll('.song-row')].filter((row) =>
      row.querySelector('.song-duration[data-duration-src]')
    );
    if (!targets.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const slot = entry.target.querySelector(
            '.song-duration[data-duration-src]'
          );
          if (slot) requestDuration(slot.dataset.durationSrc);
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: '120px 0px' }
    );

    targets.forEach((target) => observer.observe(target));

    return () => observer.disconnect();
  }, [requestDuration, songs]);

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
      data-lenis-prevent
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
                    layout
                    aria-current={isActive ? 'true' : undefined}
                    data-song-id={song.id}
                    data-revealed={reduceMotion ? undefined : 'false'}
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
                      aria-label={durationLabel(durationFor(song))}
                      data-duration-src={song.stream_url || song.audio_url}
                    >
                      {formatSongDuration(durationFor(song))}
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
