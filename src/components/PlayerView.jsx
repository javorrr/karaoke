import { formatTime } from '../lib/lrc.js';
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
  lyrics,
  onBack,
  player,
}) {
  const progress =
    player.duration > 0
      ? clamp(player.currentTime / player.duration, 0, 1) * 100
      : 0;

  return (
    <section
      id="player-view"
      className="player-view"
      hidden={hidden}
      aria-labelledby="player-title"
      data-testid="player-view"
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
                className="play-button"
                type="button"
                aria-label={
                  player.isPlaying
                    ? 'Pause — wstrzymaj piosenkę'
                    : 'Play — odtwórz piosenkę'
                }
                data-testid="play-button"
                onClick={player.togglePlay}
              >
                {player.isPlaying ? <PauseGlyph /> : <PlayGlyph />}
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
                <button
                  id="mute-button"
                  className="icon-button"
                  type="button"
                  aria-label={
                    player.muted
                      ? 'muted — włącz dźwięk'
                      : 'sound — wycisz dźwięk'
                  }
                  aria-pressed={player.muted}
                  onClick={player.toggleMute}
                >
                  {player.muted ? 'muted' : 'sound'}
                </button>
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
