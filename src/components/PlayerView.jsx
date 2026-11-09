import { useRef } from 'react';
import { formatTime } from '../lib/lrc.js';
import { getCoverStyle, getMonogram } from '../lib/cover.js';
import { useMagnetic } from '../hooks/useMagnetic.js';
import { usePointerTilt } from '../hooks/usePointerTilt.js';
import { Lyrics } from './Lyrics.jsx';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function PlayGlyph() {
  return <span className="play-glyph" aria-hidden="true" />;
}

function PauseGlyph() {
  return <span className="pause-glyph" aria-hidden="true" />;
}

export function PlayerView({
  activeSong,
  hidden,
  isPlaying,
  lyrics,
  onBack,
  player,
}) {
  const progress =
    player.duration > 0
      ? clamp(player.currentTime / player.duration, 0, 1) * 100
      : 0;

  const playButtonRef = useRef(null);
  const coverRef = useRef(null);

  useMagnetic(playButtonRef, 10);
  usePointerTilt(coverRef, 5);

  const coverStyle = {
    ...getCoverStyle(activeSong),
    /* The shared-element name belongs to the visible cover itself. Naming both
       the wrapper and an empty child aborts the transition on duplicate names. */
    viewTransitionName: 'song-cover',
  };

  const playing = Boolean(isPlaying ?? player.isPlaying);

  return (
    <section
      id="player-view"
      className="player-view"
      hidden={hidden}
      aria-labelledby="player-title"
      data-testid="player-view"
      data-playing={playing ? 'true' : 'false'}
    >
      <div className="player-topline">
        <button
          id="back-button"
          className="back-button"
          type="button"
          aria-label="← biblioteka — wróć do listy piosenek"
          data-testid="back-button"
          onClick={onBack}
        >
          ← Biblioteka
        </button>
      </div>

      <div className="player-panel" data-testid="player-panel">
        <div
          className="player-cover"
          ref={coverRef}
          aria-hidden="true"
          data-testid="player-cover"
          style={coverStyle}
        >
          <span className="player-cover-orbit" />
          <span className="player-cover-monogram">
            {getMonogram(activeSong)}
          </span>
          <span className="player-cover-eq" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </div>

        <div className="player-details">
          <p className="eyebrow">Teraz grasz</p>
          <h1 id="player-title">{activeSong?.title ?? '-'}</h1>
          <p id="player-artist" className="player-artist">
            {activeSong?.artist ?? '-'}
          </p>
          <p id="player-error" className="player-error" role="alert">
            {player.error}
          </p>

          <div className="player-controls">
            <div className="transport-controls">
              <button
                id="seek-back"
                className="secondary-button"
                type="button"
                aria-label="−10 s — przewiń 10 sekund do tyłu"
                onClick={() => player.seekBy(-10)}
              >
                −10 s
              </button>
              <button
                id="play-button"
                ref={playButtonRef}
                className="play-button"
                type="button"
                aria-label={
                  player.isPlaying
                    ? 'Pause — wstrzymaj piosenkę'
                    : 'Play — odtwórz piosenkę'
                }
                data-playing={player.isPlaying ? 'true' : 'false'}
                data-testid="play-button"
                onClick={player.togglePlay}
              >
                <span className="play-icon" aria-hidden="true">
                  <PlayGlyph />
                  <PauseGlyph />
                </span>
                <span>{player.isPlaying ? 'Pause' : 'Play'}</span>
              </button>
              <button
                id="seek-forward"
                className="secondary-button"
                type="button"
                aria-label="+10 s — przewiń 10 sekund do przodu"
                onClick={() => player.seekBy(10)}
              >
                +10 s
              </button>
            </div>

            <div className="timeline">
              <input
                id="progress-slider"
                type="range"
                min="0"
                max={player.duration || 0}
                value={player.currentTime}
                step="0.01"
                aria-label="Pozycja w utworze"
                disabled={!player.duration || player.failed}
                data-testid="progress-slider"
                style={{
                  '--progress': `${progress}%`,
                  '--buffered': `${player.buffered}%`,
                }}
                onChange={(event) => player.seek(Number(event.target.value))}
              />
              <div className="time-row">
                <span id="current-time">{formatTime(player.currentTime)}</span>
                <span id="duration">{formatTime(player.duration)}</span>
              </div>
            </div>

            <div className="mixer-controls">
              <div className="volume-control">
                <span className="mute-toggle">
                  <input
                    id="mute-toggle-state"
                    className="mute-toggle__input"
                    type="checkbox"
                    checked={player.muted}
                    readOnly
                    tabIndex={-1}
                    aria-hidden="true"
                  />
                  <button
                    id="mute-button"
                    className="icon-button mute-toggle__button"
                    type="button"
                    aria-label={
                      player.muted ? 'Włącz dźwięk' : 'Wycisz'
                    }
                    title={player.muted ? 'Włącz dźwięk' : 'Wycisz'}
                    aria-pressed={player.muted}
                    onClick={player.toggleMute}
                  >
                    <span className="mute-toggle__icons" aria-hidden="true">
                      <svg
                        className="mute-toggle__speaker"
                        viewBox="0 0 24 24"
                        focusable="false"
                      >
                        <path
                          d="M4 9.2h3.1L12 5.3v13.4L7.1 14.8H4z"
                          fill="currentColor"
                        />
                      </svg>
                      <svg
                        className="mute-toggle__waves"
                        viewBox="0 0 24 24"
                        fill="none"
                        focusable="false"
                      >
                        <path
                          d="M15 8.4a5.2 5.2 0 0 1 0 7.2M17.7 5.7a8.9 8.9 0 0 1 0 12.6"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                      <svg
                        className="mute-toggle__slash"
                        viewBox="0 0 24 24"
                        fill="none"
                        focusable="false"
                      >
                        <path
                          d="M16 9.4l5 5.2M21 9.4l-5 5.2"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                        />
                      </svg>
                    </span>
                    <span className="sr-only">
                      {player.muted ? 'muted' : 'sound'}
                    </span>
                  </button>
                </span>
                <input
                  id="volume-slider"
                  type="range"
                  min="0"
                  max="1"
                  value={player.volume}
                  step="0.01"
                  aria-label="Głośność"
                  data-testid="volume-slider"
                  style={{ '--volume': `${player.volume * 100}%` }}
                  onChange={(event) => player.setVolume(event.target.value)}
                />
              </div>

              <label className="select-control" htmlFor="speed-select">
                <span>Tempo</span>
                <select
                  id="speed-select"
                  value={String(player.speed)}
                  data-lenis-prevent
                  onChange={(event) => player.setSpeed(event.target.value)}
                >
                  <option value="0.5">0,5×</option>
                  <option value="0.75">0,75×</option>
                  <option value="1">1×</option>
                  <option value="1.25">1,25×</option>
                  <option value="1.5">1,5×</option>
                </select>
              </label>

              <label className="toggle-control" htmlFor="lyrics-follow">
                <input
                  id="lyrics-follow"
                  type="checkbox"
                  checked={player.follow}
                  onChange={(event) => player.setFollow(event.target.checked)}
                />
                <span>Śledź tekst</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <section className="lyrics-container" aria-labelledby="lyrics-title">
        <div className="lyrics-heading">
          <h2 id="lyrics-title">Tekst piosenki</h2>
          <span className="lyrics-hint">Kliknij wers, aby przewinąć</span>
        </div>
        <Lyrics
          activeIndex={lyrics.activeIndex}
          follow={player.follow}
          onSeek={player.seek}
          phrases={lyrics.phrases}
          status={lyrics.status}
        />
      </section>
    </section>
  );
}
