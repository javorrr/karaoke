import { fetchSongs, recordSongPlay } from './lib/api.js';
import { durationLabel, formatSongDuration, getCoverStyle, getMonogram } from './lib/cover.js';
import { getCachedDuration, requestDuration, subscribeDurations } from './lib/durations.js';
import { formatTime, groupIntoPhrases, parseLRC } from './lib/lrc.js';
import { buildFilterFields, songMatchesFilter } from './lib/songMetadata.js';
import { WakeSlider } from './lib/wakeSlider.js';

const EMPTY_FILTERS = { genre: '', language: '', decade: '' };
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const AUDIO_ERROR = 'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.';
const THEME_STORAGE_KEY = 'karaoke:theme';
const MODE_STORAGE_KEY = 'karaoke:mode';
const PLAYER_KEYS = {
  volume: 'karaoke:volume',
  muted: 'karaoke:muted',
  speed: 'karaoke:speed',
  follow: 'karaoke:follow-lyrics',
};
const THEMES = [
  { id: 'signal', label: 'Sygnał', swatch: '#c8342a' },
  { id: 'jade', label: 'Jadeit', swatch: '#0e7a5f' },
  { id: 'cobalt', label: 'Kobalt', swatch: '#3a4fc4' },
];

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
})[character]);
const readStored = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};
const store = (key, value) => {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Preferencje mogą być zablokowane w trybie prywatnym.
  }
};
const coverStyle = (song) => Object.entries(getCoverStyle(song))
  .map(([name, value]) => `${name}:${value}`)
  .join(';');
const audioSource = (song) => song?.stream_url || song?.audio_url || '';
const countLabel = (count) => `${count} ${count === 1 ? 'piosenka' : 'piosenek'}`;
const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function initialPreferences() {
  const volumeValue = readStored(PLAYER_KEYS.volume);
  const storedVolume = volumeValue === null ? Number.NaN : Number(volumeValue);
  const volume = Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1
    ? storedVolume
    : 1;
  const speedValue = readStored(PLAYER_KEYS.speed);
  const storedSpeed = speedValue === null ? Number.NaN : Number(speedValue);

  return {
    volume,
    muted: readStored(PLAYER_KEYS.muted) === 'true' || volume === 0,
    speed: SPEEDS.includes(storedSpeed) ? storedSpeed : 1,
    follow: readStored(PLAYER_KEYS.follow) !== 'false',
  };
}

function headerMarkup() {
  const theme = document.documentElement.dataset.theme || 'signal';
  const mode = document.documentElement.dataset.mode === 'dark' ? 'dark' : 'light';

  return `<header class="site-header" data-testid="site-header">
    <div class="container header-content">
      <a class="brand" href="./" aria-label="karaoke. — strona główna" data-testid="brand">
        <span class="brand-word">karaoke<span class="brand-dot">.</span></span>
      </a>
      <div class="header-actions">
        <nav class="header-nav" aria-label="Główna nawigacja">
          <a href="#songs-list">Biblioteka</a>
          <a href="#recommendations">Na dziś</a>
        </nav>
        <div class="theme-switcher" data-testid="theme-switcher">
          <div class="theme-presets" role="radiogroup" aria-label="Motyw kolorystyczny">
            ${THEMES.map((item) => `<button class="theme-option" type="button" role="radio"
              aria-checked="${theme === item.id}" aria-label="Motyw: ${item.label}"
              title="Motyw: ${item.label}" data-testid="theme-${item.id}"
              data-action="theme" data-value="${item.id}" tabindex="${theme === item.id ? '0' : '-1'}">
              <span class="theme-swatch" style="--swatch:${item.swatch}" aria-hidden="true"></span>
            </button>`).join('')}
          </div>
          <label class="mode-switch" for="mode-switch">
            <span class="mode-switch__toggle-wrap">
              <input id="mode-switch" class="mode-switch__toggle" type="checkbox" role="switch"
                name="mode" value="dark" aria-checked="${mode === 'dark'}" aria-label="Tryb ciemny"
                title="Tryb ciemny" data-testid="theme-mode" data-action="mode" ${mode === 'dark' ? 'checked' : ''}>
              <span class="mode-switch__icon" aria-hidden="true">${'<span class="mode-switch__icon-part"></span>'.repeat(9)}</span>
            </span>
          </label>
        </div>
      </div>
    </div>
  </header>`;
}

function heroMarkup() {
  return `<div class="hero-layout">
    <div class="intro">
      <p class="eyebrow">Karaoke, bez pośpiechu</p>
      <h1 id="library-title">Twój głos.<br><span class="accent">Twój moment.</span></h1>
      <p class="intro-copy">Znajdź numer, który brzmi jak Ty. Wciśnij play i przejmij scenę.</p>
    </div>
  </div>`;
}

function searchMarkup(query) {
  return `<label class="search-box" for="song-search">
    <svg class="search-icon" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
      <circle cx="8.75" cy="8.75" r="5.75"></circle><path d="m13 13 4 4"></path>
    </svg>
    <span class="sr-only">Szukaj piosenki lub wykonawcy</span>
    <input id="song-search" type="search" placeholder="Szukaj po tytule lub wykonawcy"
      autocomplete="off" spellcheck="false" aria-label="Szukaj piosenki lub wykonawcy"
      data-testid="search-input" value="${escapeHtml(query)}">
  </label>`;
}

function filtersMarkup(app) {
  const fields = app.filterFields;
  const options = fields.map(({ field, label, emptyLabel, options: values }) => {
    const aria = {
      genre: 'Filtruj według gatunku',
      language: 'Filtruj według języka',
      decade: 'Filtruj według dekady',
    }[field] || `Filtruj według: ${label}`;
    return `<label class="filter-field" for="${escapeHtml(field)}-filter">
      <span>${escapeHtml(label)}</span>
      <select id="${escapeHtml(field)}-filter" aria-label="${escapeHtml(aria)}"
        data-filter-field="${escapeHtml(field)}" data-lenis-prevent>
        <option value="">${escapeHtml(emptyLabel)}</option>
        ${values.map((value) => `<option value="${escapeHtml(value)}" ${app.filters[field] === value ? 'selected' : ''}>${escapeHtml(value)}</option>`).join('')}
      </select>
    </label>`;
  }).join('');

  return `<section class="filters-panel" aria-labelledby="filters-title" data-testid="filters">
    <div class="filters-heading"><h2 id="filters-title" class="filters-title">Dopasuj repertuar</h2></div>
    <div class="filters-grid">${options}
      <button id="reset-filters" class="reset-filters" type="button" data-action="reset-filters"
        ${app.filtersActive ? '' : 'disabled'} aria-disabled="${!app.filtersActive}">Wyczyść filtry</button>
    </div>
  </section>`;
}

function recommendationsMarkup(songs) {
  const playLabel = (count) => `${count} ${count === 1 ? 'śpiewanie' : 'śpiewań'}`;
  return `<section id="recommendations" class="recommendations" aria-labelledby="recommended-title"
    data-testid="recommendations" ${songs.length ? '' : 'hidden'}>
    <div class="recommendation-heading"><h2 id="recommended-title">Na dziś</h2>
      <p class="recommendation-note">Najczęściej śpiewane</p></div>
    <ol class="recommended-list">${songs.map(({ song, playCount }) => `<li class="recommendation-item">
      <button class="recommended-song" type="button" data-action="select-song" data-song-id="${escapeHtml(song.id)}">
        <span class="recommendation-song-title">${escapeHtml(song.title)}</span>
        <span class="recommendation-song-artist">${escapeHtml(song.artist)}</span>
        <span class="recommendation-plays">${playLabel(playCount)}</span>
      </button></li>`).join('')}</ol>
  </section>`;
}

function songRowMarkup(song, index, app) {
  const active = song.id === app.activeSong?.id;
  const selectedCover = song.id === (app.transitionSongId ?? app.activeSong?.id);
  const classes = ['song-row', active ? 'is-active' : '', active && app.player.isPlaying ? 'is-playing' : '']
    .filter(Boolean).join(' ');
  const duration = app.durationFor(song);
  const style = `${coverStyle(song)}${selectedCover ? ';view-transition-name:song-cover' : ''}`;

  return `<article class="${classes}" ${active ? 'aria-current="true"' : ''}
    data-song-id="${escapeHtml(song.id)}" ${app.motionReduced ? '' : 'data-revealed="false"'} data-testid="song-row">
    <span class="song-index" aria-hidden="true"><span class="song-index-number">${index + 1}</span>
      <span class="song-index-play"></span><span class="song-equalizer"><i></i><i></i><i></i></span></span>
    <div class="song-cover" aria-hidden="true" data-testid="song-cover" style="${style}">
      <span class="cover-monogram">${escapeHtml(getMonogram(song))}</span></div>
    <div class="song-info"><h3 class="song-title">${escapeHtml(song.title)}</h3>
      <p class="song-artist">${escapeHtml(song.artist)}</p></div>
    <span class="song-duration" aria-label="${durationLabel(duration)}"
      ${audioSource(song) ? `data-duration-src="${escapeHtml(audioSource(song))}"` : ''}>${formatSongDuration(duration)}</span>
    <button class="sing-button" type="button" aria-label="Śpiewaj: ${escapeHtml(song.title)} - ${escapeHtml(song.artist)}"
      data-testid="sing-button" data-action="select-song" data-song-id="${escapeHtml(song.id)}">
      <span class="sing-icon" aria-hidden="true"></span><span class="sing-label">Śpiewaj</span>
    </button>
  </article>`;
}

function songsMarkup(app) {
  if (app.loading && app.filteredSongs.length === 0) {
    return Array.from({ length: 3 }, (_, index) => `<div class="song-skeleton" aria-hidden="true" data-testid="song-skeleton">
      <span class="skeleton-block skeleton-index"></span><span class="skeleton-block skeleton-cover"></span>
      <div class="skeleton-info"><span class="skeleton-block skeleton-title"></span>
        <span class="skeleton-block skeleton-artist"></span></div><span class="skeleton-block skeleton-action"></span>
    </div>`).join('');
  }
  return app.filteredSongs.map((song, index) => songRowMarkup(song, index, app)).join('');
}

function timedLyrics(rawLines, duration) {
  let lines = rawLines;
  if (lines.length && lines.every((line) => line.time === null) && duration > 0) {
    const interval = duration / lines.length;
    lines = lines.map((line, index) => ({ ...line, time: index * interval }));
  }
  return lines.map((line, index) => {
    if (!Number.isFinite(line.time)) return { ...line, index, end: null };
    const next = lines.slice(index + 1).find((candidate) => Number.isFinite(candidate.time));
    const fallbackEnd = next?.time ?? (duration > 0 ? duration : Number.POSITIVE_INFINITY);
    return { ...line, index, end: Number.isFinite(line.end) && line.end > line.time ? line.end : fallbackEnd };
  });
}

function lyricsMarkup(app) {
  const { status, lines } = app.lyrics;
  let content = '';
  if (status === 'loading') content = 'Ładowanie tekstu...';
  if (status === 'error') content = 'Nie udało się pobrać tekstu.';
  if (status === 'empty') content = 'Brak zsynchronizowanego tekstu.';
  if (status === 'ready') {
    content = groupIntoPhrases(lines).map((phrase, phraseIndex) => `<div class="lyrics-phrase" data-phrase="${phraseIndex}">
      ${phrase.map((line) => {
        const active = line.index === app.activeLyricIndex;
        const state = active ? 'active' : line.index < app.activeLyricIndex ? 'past' : 'upcoming';
        const timed = Number.isFinite(line.time);
        return `<span class="lyrics-line ${state}" ${timed ? 'role="button" tabindex="0" data-action="lyrics-line"' : ''}
          ${timed ? `data-time="${line.time}" data-lyrics-index="${line.index}" aria-label="Przewiń do: ${escapeHtml(line.text)}"` : ''}
          data-state="${state}" ${active ? 'aria-current="true"' : ''}>${escapeHtml(line.text)} </span>`;
      }).join('')}</div>`).join('');
  }
  return `<div class="lyrics-stage"><div id="lyrics-display" aria-live="polite" data-testid="lyrics-display" data-lenis-prevent>${content}</div></div>`;
}

function playerMarkup(app) {
  const song = app.activeSong;
  const player = app.player;
  const progress = player.duration > 0 ? clamp(player.currentTime / player.duration, 0, 1) * 100 : 0;
  const style = `${coverStyle(song)};view-transition-name:song-cover`;
  return `<section id="player-view" class="player-view" ${app.view !== 'player' ? 'hidden' : ''}
    aria-labelledby="player-title" data-testid="player-view" data-playing="${player.isPlaying}">
    <div class="player-topline"><button id="back-button" class="back-button" type="button"
      aria-label="← biblioteka — wróć do listy piosenek" data-testid="back-button" data-action="back">← Biblioteka</button></div>
    <div class="player-panel" data-testid="player-panel">
      <div class="player-cover" aria-hidden="true" data-testid="player-cover" style="${style}">
        <span class="player-cover-orbit"></span><span class="player-cover-monogram">${escapeHtml(getMonogram(song))}</span>
        <span class="player-cover-eq" aria-hidden="true"><i></i><i></i><i></i></span></div>
      <div class="player-details"><p class="eyebrow">Teraz grasz</p>
        <h1 id="player-title">${escapeHtml(song?.title || '-')}</h1>
        <p id="player-artist" class="player-artist">${escapeHtml(song?.artist || '-')}</p>
        <p id="player-error" class="player-error" role="alert">${escapeHtml(player.error)}</p>
        <div class="player-controls"><div class="transport-controls">
          <button id="seek-back" class="secondary-button" type="button" aria-label="−10 s — przewiń 10 sekund do tyłu" data-action="seek-back">−10 s</button>
          <button id="play-button" class="play-button" type="button" aria-label="${player.isPlaying ? 'Pause — wstrzymaj piosenkę' : 'Play — odtwórz piosenkę'}"
            data-playing="${player.isPlaying}" data-testid="play-button" data-action="toggle-play">
            <span class="play-icon" aria-hidden="true"><span class="play-glyph"></span><span class="pause-glyph"></span></span>
            <span>${player.isPlaying ? 'Pause' : 'Play'}</span></button>
          <button id="seek-forward" class="secondary-button" type="button" aria-label="+10 s — przewiń 10 sekund do przodu" data-action="seek-forward">+10 s</button>
        </div>
        <div class="timeline"><input id="progress-slider" type="range" min="0" max="${player.duration || 0}"
          value="${player.currentTime}" step="0.01" aria-label="Pozycja w utworze" ${!player.duration || player.failed ? 'disabled' : ''}
          data-testid="progress-slider" style="--progress:${progress}%;--buffered:${player.buffered}%" data-action="seek">
          <div class="time-row"><span id="current-time">${formatTime(player.currentTime)}</span>
            <span id="duration">${formatTime(player.duration)}</span></div></div>
        <div class="mixer-controls"><div class="volume-control"><span class="mute-toggle">
          <input id="mute-toggle-state" class="mute-toggle__input" type="checkbox" ${player.muted ? 'checked' : ''} readonly tabindex="-1" aria-hidden="true">
          <button id="mute-button" class="icon-button mute-toggle__button" type="button"
            aria-label="${player.muted ? 'Włącz dźwięk' : 'Wycisz'}" title="${player.muted ? 'Włącz dźwięk' : 'Wycisz'}"
            aria-pressed="${player.muted}" data-action="toggle-mute">
            <span class="mute-toggle__icons" aria-hidden="true">
              <svg class="mute-toggle__speaker" viewBox="0 0 24 24" focusable="false"><path d="M4 9.2h3.1L12 5.3v13.4L7.1 14.8H4z" fill="currentColor"></path></svg>
              <svg class="mute-toggle__waves" viewBox="0 0 24 24" fill="none" focusable="false"><path d="M15 8.4a5.2 5.2 0 0 1 0 7.2M17.7 5.7a8.9 8.9 0 0 1 0 12.6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>
              <svg class="mute-toggle__slash" viewBox="0 0 24 24" fill="none" focusable="false"><path d="M16 9.4l5 5.2M21 9.4l-5 5.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>
            </span><span class="sr-only">${player.muted ? 'muted' : 'sound'}</span></button>
          </span><div id="volume-slider" class="wake-slider-mount" data-testid="volume-slider"></div></div>
          <label class="select-control" for="speed-select"><span>Tempo</span><select id="speed-select" data-lenis-prevent data-action="speed">
            ${SPEEDS.map((speed) => `<option value="${speed}" ${speed === player.speed ? 'selected' : ''}>${String(speed).replace('.', ',')}×</option>`).join('')}
          </select></label>
          <label class="toggle-control" for="lyrics-follow"><input id="lyrics-follow" type="checkbox" data-action="follow" ${player.follow ? 'checked' : ''}><span>Śledź tekst</span></label>
        </div></div>
    </div>
    </div>
    <section class="lyrics-container" aria-labelledby="lyrics-title"><div class="lyrics-heading">
      <h2 id="lyrics-title">Tekst piosenki</h2><span class="lyrics-hint">Kliknij wers, aby przewinąć</span></div>
      ${lyricsMarkup(app)}</section>
  </section>`;
}

export class KaraokeApp {
  constructor(root) {
    this.root = root;
    this.audio = new Audio();
    this.preferences = initialPreferences();
    this.audio.preload = 'metadata';
    this.audio.volume = this.preferences.volume;
    this.audio.muted = this.preferences.muted;
    this.audio.playbackRate = this.preferences.speed;
    this.view = 'library';
    this.activeSong = null;
    this.transitionSongId = null;
    this.allSongs = [];
    this.loadedSongs = [];
    this.query = '';
    this.filters = { ...EMPTY_FILTERS };
    this.filterFields = buildFilterFields([]);
    this.loading = true;
    this.error = '';
    this.requestId = 0;
    this.searchTimer = 0;
    this.lyricsRequest = null;
    this.rawLyrics = [];
    this.lyricsStatus = 'idle';
    this.lyrics = { status: 'idle', lines: [] };
    this.durationCache = new Map();
    this.motionReduced = reducedMotion();
    this.player = {
      currentTime: 0,
      duration: 0,
      buffered: 0,
      isPlaying: false,
      error: '',
      failed: false,
      ...this.preferences,
    };
    this.wakeSlider = null;
    this.lastActiveLyricIndex = -1;
    this.observers = [];
    this.bindEvents();
    this.unsubscribeDurations = subscribeDurations((url, seconds) => {
      if (seconds !== null) this.durationCache.set(url, seconds);
      this.updateDurationLabels(url, seconds);
    });
    this.bindAudio();
    this.render();
    void this.loadSongs('');
  }

  get filteredSongs() {
    return this.loadedSongs.filter((song) => this.filterFields.every((field) =>
      songMatchesFilter(song, field, this.filters[field.field])));
  }

  get filtersActive() {
    return Object.values(this.filters).some(Boolean);
  }

  get recommendations() {
    return this.allSongs.map((song, index) => ({ song, index, playCount: Number(song.play_count) || 0 }))
      .sort((first, second) => second.playCount - first.playCount || first.index - second.index)
      .slice(0, 3);
  }

  get activeLyricIndex() {
    const time = this.player.currentTime;
    return this.lyrics.lines.findIndex((line) => Number.isFinite(line.time) && time >= line.time && time < line.end);
  }

  durationFor(song) {
    const url = audioSource(song);
    const cached = this.durationCache.get(url) ?? getCachedDuration(url);
    const known = Number(song?.duration);
    return cached ?? (Number.isFinite(known) && known > 0 ? known : undefined);
  }

  bindEvents() {
    this.onClick = (event) => this.handleClick(event);
    this.onInput = (event) => this.handleInput(event);
    this.onChange = (event) => this.handleChange(event);
    this.onKeyDown = (event) => this.handleKeyDown(event);
    this.onPointerMove = (event) => this.handlePointerMove(event);
    this.onPointerLeave = (event) => this.handlePointerLeave(event);
    this.onWindowKeyDown = (event) => this.handleWindowKeyDown(event);
    this.onStorage = (event) => this.handleStorage(event);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('input', this.onInput);
    this.root.addEventListener('change', this.onChange);
    this.root.addEventListener('keydown', this.onKeyDown);
    this.root.addEventListener('pointermove', this.onPointerMove, { passive: true });
    this.root.addEventListener('pointerout', this.onPointerLeave);
    window.addEventListener('keydown', this.onWindowKeyDown);
    window.addEventListener('storage', this.onStorage);
  }

  bindAudio() {
    this.onTimeUpdate = () => {
      this.player.currentTime = this.audio.currentTime || 0;
      this.updatePlayerUI();
      this.updateActiveLyrics();
    };
    this.onProgress = () => {
      this.player.buffered = this.readBuffered();
      this.updatePlayerUI();
    };
    this.onMetadata = () => {
      this.player.duration = Number.isFinite(this.audio.duration) && this.audio.duration > 0 ? this.audio.duration : 0;
      this.player.currentTime = this.audio.currentTime || 0;
      this.player.buffered = this.readBuffered();
      this.rebuildLyrics();
      this.updatePlayerUI();
      this.updateActiveLyrics(true);
    };
    this.onPlay = () => {
      this.player.isPlaying = true;
      this.updatePlayerUI();
      this.updateSongActiveState();
    };
    this.onPause = () => {
      this.player.isPlaying = false;
      this.updatePlayerUI();
      this.updateSongActiveState();
    };
    this.onEnded = () => {
      this.player.isPlaying = false;
      this.audio.currentTime = 0;
      this.player.currentTime = 0;
      this.updatePlayerUI();
      this.updateSongActiveState();
      this.updateActiveLyrics(true);
    };
    this.onAudioError = () => {
      this.player.isPlaying = false;
      this.player.failed = true;
      this.player.error = AUDIO_ERROR;
      this.updatePlayerUI();
    };
    this.onVolumeChange = () => {
      this.player.volume = this.audio.volume;
      this.player.muted = this.audio.muted || this.audio.volume === 0;
      this.preferences.volume = this.player.volume;
      this.preferences.muted = this.player.muted;
      store(PLAYER_KEYS.volume, this.player.volume);
      store(PLAYER_KEYS.muted, this.player.muted);
      this.updatePlayerUI();
    };
    this.audio.addEventListener('timeupdate', this.onTimeUpdate);
    this.audio.addEventListener('progress', this.onProgress);
    this.audio.addEventListener('loadedmetadata', this.onMetadata);
    this.audio.addEventListener('durationchange', this.onMetadata);
    this.audio.addEventListener('play', this.onPlay);
    this.audio.addEventListener('pause', this.onPause);
    this.audio.addEventListener('ended', this.onEnded);
    this.audio.addEventListener('error', this.onAudioError);
    this.audio.addEventListener('volumechange', this.onVolumeChange);
  }

  readBuffered() {
    if (!this.player.duration || !this.audio.buffered.length) return 0;
    let end = 0;
    for (let index = 0; index < this.audio.buffered.length; index += 1) {
      if (this.audio.buffered.start(index) <= this.audio.currentTime + 1) {
        end = Math.max(end, this.audio.buffered.end(index));
      }
    }
    return clamp((end / this.player.duration) * 100, 0, 100);
  }

  async loadSongs(query) {
    const requestId = ++this.requestId;
    this.loading = true;
    this.error = '';
    this.renderLibrary();
    try {
      const results = await fetchSongs(query);
      if (requestId !== this.requestId) return;
      if (!query) {
        this.allSongs = results;
        this.loadedSongs = results;
        this.filterFields = buildFilterFields(results);
      } else {
        this.loadedSongs = results.map((song) => this.allSongs.find((item) => item.id === song.id) || song);
      }
    } catch (error) {
      if (requestId !== this.requestId) return;
      if (!query) {
        this.allSongs = [];
        this.filterFields = buildFilterFields([]);
      }
      this.loadedSongs = [];
      this.error = error.message;
    } finally {
      if (requestId === this.requestId) {
        this.loading = false;
        this.renderLibrary();
      }
    }
  }

  scheduleSearch(value) {
    this.query = value;
    window.clearTimeout(this.searchTimer);
    this.searchTimer = window.setTimeout(() => void this.loadSongs(this.query), 300);
  }

  async loadLyrics(song) {
    this.lyricsRequest?.abort();
    this.lyricsRequest = new AbortController();
    this.rawLyrics = [];
    this.lyricsStatus = song ? 'loading' : 'idle';
    this.rebuildLyrics();
    this.renderLyrics();
    if (!song) return;
    try {
      let content = '';
      if (song.lrc_url) {
        const response = await fetch(song.lrc_url, { signal: this.lyricsRequest.signal });
        if (!response.ok) throw new Error('Brak pliku LRC');
        content = await response.text();
      } else if (song.title) {
        const params = new URLSearchParams({ title: song.title, artist: song.artist || '' });
        const response = await fetch(`api/lyrics.php?${params}`, { signal: this.lyricsRequest.signal });
        if (!response.ok) throw new Error('Brak tekstu LRCLIB');
        const data = await response.json();
        content = data.lyrics || '';
      } else {
        throw new Error('Brak danych piosenki');
      }
      if (this.lyricsRequest.signal.aborted) return;
      this.rawLyrics = parseLRC(content);
      this.lyricsStatus = this.rawLyrics.length ? 'ready' : 'empty';
    } catch {
      if (this.lyricsRequest.signal.aborted) return;
      this.lyricsStatus = 'error';
    }
    this.rebuildLyrics();
    this.renderLyrics();
  }

  rebuildLyrics() {
    this.lyrics = {
      status: this.lyricsStatus,
      lines: timedLyrics(this.rawLyrics, this.player.duration),
    };
    this.lastActiveLyricIndex = -1;
  }

  render() {
    this.wakeSlider?.destroy();
    this.wakeSlider = null;
    const focused = this.root.contains(document.activeElement) ? document.activeElement?.id : '';
    const selection = focused === 'song-search'
      ? [document.activeElement.selectionStart, document.activeElement.selectionEnd]
      : null;
    const lyricsScroll = this.root.querySelector('#lyrics-display')?.scrollTop || 0;
    this.root.innerHTML = `<a class="skip-link" href="#main-content">Przejdź do treści</a>
      ${headerMarkup()}<main class="container" id="main-content" tabindex="-1">
        <section id="library-view" class="library-view" ${this.view !== 'library' ? 'hidden' : ''}
          aria-labelledby="library-title" data-testid="library-view">${heroMarkup()}
          ${searchMarkup(this.query)}${filtersMarkup(this)}${recommendationsMarkup(this.recommendations)}
          <div class="list-heading"><h2>Wszystkie piosenki</h2><span id="song-count" class="song-count" aria-live="polite" data-testid="song-count">${this.error ? '' : countLabel(this.filteredSongs.length)}</span></div>
          <div id="songs-list" class="songs-list" aria-live="polite" aria-busy="${this.loading}" data-testid="songs-list" data-lenis-prevent>${songsMarkup(this)}</div>
          <p id="list-status" class="status-message" role="status" data-testid="list-status" ${this.error || this.loading || (!this.loading && !this.filteredSongs.length) ? `data-state="${this.error ? 'error' : this.loading ? 'loading' : 'empty'}"` : ''}>${escapeHtml(this.error || (this.loading ? 'Ładowanie piosenek...' : !this.filteredSongs.length ? 'Nie znaleziono piosenek' : ''))}</p>
        </section>${playerMarkup(this)}
      </main>`;
    const display = this.root.querySelector('#lyrics-display');
    if (display) display.scrollTop = lyricsScroll;
    if (focused) {
      const next = this.root.querySelector(`#${CSS.escape(focused)}`);
      next?.focus({ preventScroll: true });
      if (selection && next?.setSelectionRange) next.setSelectionRange(...selection);
    }
    this.updatePlayerUI();
    this.updateActiveLyrics(true);
    this.setupObservers();
    this.setupVolumeSlider();
  }

  setupVolumeSlider() {
    const host = this.root.querySelector('#volume-slider');
    if (!host) return;
    this.wakeSlider = new WakeSlider(host, {
      value: this.player.volume,
      min: 0,
      max: 1,
      step: 0.01,
      bars: 18,
      height: 36,
      restHeight: 8,
      gap: 2,
      sensitivity: 1,
      reach: 6,
      skew: 0.6,
      glide: 0.3,
      smoothing: 100,
      showValue: false,
      formatValue: (value) => `${Math.round(value * 100)}%`,
      ariaLabel: 'Głośność',
      onChange: (value) => this.setVolume(value),
    });
  }

  renderLibrary() {
    const library = this.root.querySelector('#library-view');
    if (!library) {
      this.render();
      return;
    }
    const query = this.root.querySelector('#song-search')?.value ?? this.query;
    const scrollY = window.scrollY;
    const focusedId = this.root.contains(document.activeElement) ? document.activeElement?.id : '';
    const selection = focusedId === 'song-search'
      ? [document.activeElement.selectionStart, document.activeElement.selectionEnd]
      : null;
    library.innerHTML = `${heroMarkup()}${searchMarkup(query)}${filtersMarkup(this)}${recommendationsMarkup(this.recommendations)}
      <div class="list-heading"><h2>Wszystkie piosenki</h2><span id="song-count" class="song-count" aria-live="polite" data-testid="song-count">${this.error ? '' : countLabel(this.filteredSongs.length)}</span></div>
      <div id="songs-list" class="songs-list" aria-live="polite" aria-busy="${this.loading}" data-testid="songs-list" data-lenis-prevent>${songsMarkup(this)}</div>
      <p id="list-status" class="status-message" role="status" data-testid="list-status" ${this.error || this.loading || !this.filteredSongs.length ? `data-state="${this.error ? 'error' : this.loading ? 'loading' : 'empty'}"` : ''}>${escapeHtml(this.error || (this.loading ? 'Ładowanie piosenek...' : !this.filteredSongs.length ? 'Nie znaleziono piosenek' : ''))}</p>`;
    if (focusedId) {
      const focused = this.root.querySelector(`#${CSS.escape(focusedId)}`);
      focused?.focus({ preventScroll: true });
      if (selection && focused?.setSelectionRange) focused.setSelectionRange(...selection);
    }
    window.scrollTo({ top: scrollY, behavior: 'instant' });
    this.setupObservers();
  }

  renderLyrics() {
    const display = this.root.querySelector('#lyrics-display');
    if (!display) return;
    const scrollTop = display.scrollTop;
    display.outerHTML = lyricsMarkup(this);
    const nextDisplay = this.root.querySelector('#lyrics-display');
    nextDisplay.scrollTop = scrollTop;
    this.updateActiveLyrics(true);
  }

  setupObservers() {
    for (const observer of this.observers) observer.disconnect();
    this.observers = [];
    const rows = [...this.root.querySelectorAll('.song-row')];
    if (!rows.length) return;
    if (!this.motionReduced && 'IntersectionObserver' in window) {
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.dataset.revealed = 'true';
            observer.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
      rows.filter((row) => row.dataset.revealed === 'false').forEach((row) => revealObserver.observe(row));
      this.observers.push(revealObserver);
    }
    if ('IntersectionObserver' in window) {
      const durationObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const source = entry.target.querySelector('.song-duration[data-duration-src]')?.dataset.durationSrc;
          if (source) void requestDuration(source);
          observer.unobserve(entry.target);
        });
      }, { rootMargin: '120px 0px' });
      rows.filter((row) => row.querySelector('.song-duration[data-duration-src]')).forEach((row) => durationObserver.observe(row));
      this.observers.push(durationObserver);
    }
  }

  updateDurationLabels(url, seconds) {
    if (seconds === null) return;
    this.root.querySelectorAll('.song-duration').forEach((element) => {
      if (element.dataset.durationSrc !== url) return;
      element.textContent = formatSongDuration(seconds);
      element.setAttribute('aria-label', durationLabel(seconds));
    });
  }

  updatePlayerUI() {
    const playerView = this.root.querySelector('#player-view');
    if (!playerView) return;
    const { currentTime, duration, isPlaying, volume, buffered, muted, error, failed } = this.player;
    playerView.dataset.playing = String(isPlaying);
    const playButton = this.root.querySelector('#play-button');
    if (playButton) {
      playButton.dataset.playing = String(isPlaying);
      playButton.setAttribute('aria-label', isPlaying ? 'Pause — wstrzymaj piosenkę' : 'Play — odtwórz piosenkę');
      playButton.lastElementChild.textContent = isPlaying ? 'Pause' : 'Play';
    }
    const current = this.root.querySelector('#current-time');
    const total = this.root.querySelector('#duration');
    if (current) current.textContent = formatTime(currentTime);
    if (total) total.textContent = formatTime(duration);
    const progress = this.root.querySelector('#progress-slider');
    if (progress) {
      progress.max = String(duration || 0);
      progress.disabled = !duration || failed;
      progress.style.setProperty('--progress', `${duration > 0 ? clamp(currentTime / duration, 0, 1) * 100 : 0}%`);
      progress.style.setProperty('--buffered', `${buffered}%`);
      if (document.activeElement !== progress) progress.value = String(currentTime);
    }
    this.wakeSlider?.setValue(volume, { instant: true });
    const mute = this.root.querySelector('#mute-button');
    if (mute) {
      mute.setAttribute('aria-label', muted ? 'Włącz dźwięk' : 'Wycisz');
      mute.title = muted ? 'Włącz dźwięk' : 'Wycisz';
      mute.setAttribute('aria-pressed', String(muted));
      mute.querySelector('.sr-only').textContent = muted ? 'muted' : 'sound';
    }
    const muteState = this.root.querySelector('#mute-toggle-state');
    if (muteState) muteState.checked = muted;
    const errorElement = this.root.querySelector('#player-error');
    if (errorElement) errorElement.textContent = error;
  }

  updateActiveLyrics(forceScroll = false) {
    const activeIndex = this.activeLyricIndex;
    const lines = this.root.querySelectorAll('.lyrics-line[data-lyrics-index]');
    lines.forEach((line) => {
      const index = Number(line.dataset.lyricsIndex);
      const active = index === activeIndex;
      const state = active ? 'active' : index < activeIndex ? 'past' : 'upcoming';
      line.classList.remove('active', 'past', 'upcoming');
      line.classList.add(state);
      line.dataset.state = state;
      if (active) line.setAttribute('aria-current', 'true');
      else line.removeAttribute('aria-current');
    });
    if (!this.player.follow || activeIndex < 0 || (!forceScroll && activeIndex === this.lastActiveLyricIndex)) return;
    const display = this.root.querySelector('#lyrics-display');
    const line = this.root.querySelector(`.lyrics-line[data-lyrics-index="${activeIndex}"]`);
    if (!display || !line) return;
    const displayRect = display.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const top = display.scrollTop + lineRect.top - displayRect.top - (display.clientHeight - lineRect.height) / 2;
    display.scrollTo({ top: Math.max(0, top), behavior: this.motionReduced ? 'auto' : 'smooth' });
    this.lastActiveLyricIndex = activeIndex;
  }

  updateSongActiveState() {
    this.root.querySelectorAll('.song-row').forEach((row) => {
      const active = String(this.activeSong?.id) === row.dataset.songId;
      row.classList.toggle('is-active', active);
      row.classList.toggle('is-playing', active && this.player.isPlaying);
      if (active) row.setAttribute('aria-current', 'true');
      else row.removeAttribute('aria-current');
    });
  }

  async selectSong(songId) {
    const song = this.allSongs.find((item) => String(item.id) === String(songId))
      || this.loadedSongs.find((item) => String(item.id) === String(songId));
    if (!song) return;
    const row = this.root.querySelector(`.song-row[data-song-id="${CSS.escape(String(song.id))}"]`);
    if (row) row.style.viewTransitionName = '';
    this.transitionSongId = song.id;
    this.activeSong = song;
    this.player.currentTime = 0;
    this.player.duration = 0;
    this.player.buffered = 0;
    this.player.error = '';
    this.player.failed = false;
    this.audio.pause();
    const source = audioSource(song);
    if (source) this.audio.src = source;
    else this.audio.removeAttribute('src');
    this.audio.load();
    this.audio.playbackRate = this.preferences.speed;
    this.loadLyrics(song);
    this.runTransition(() => {
      this.view = 'player';
      this.render();
    });
    try {
      const playCount = await recordSongPlay(song.id);
      this.allSongs = this.allSongs.map((item) => item.id === song.id ? { ...item, play_count: playCount } : item);
      this.loadedSongs = this.loadedSongs.map((item) => item.id === song.id ? { ...item, play_count: playCount } : item);
      this.renderLibrary();
    } catch (error) {
      this.player.error = error.message;
      this.updatePlayerUI();
    }
  }

  runTransition(update) {
    if (this.motionReduced || typeof document.startViewTransition !== 'function') {
      update();
      return;
    }
    let ran = false;
    try {
      document.startViewTransition(() => {
        ran = true;
        update();
      });
    } catch {
      if (!ran) update();
    }
  }

  openLibrary() {
    this.audio.pause();
    this.runTransition(() => {
      this.view = 'library';
      this.render();
    });
    window.__lenis?.scrollTo(0, { immediate: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  async togglePlay() {
    if (!this.activeSong) return;
    this.player.error = '';
    if (this.audio.paused) {
      try {
        await this.audio.play();
      } catch {
        this.player.error = AUDIO_ERROR;
        this.player.isPlaying = false;
        this.updatePlayerUI();
      }
    } else {
      this.audio.pause();
    }
  }

  seek(time) {
    const duration = Number.isFinite(this.audio.duration) && this.audio.duration > 0 ? this.audio.duration : this.player.duration;
    const target = duration > 0 ? clamp(time, 0, duration) : Math.max(0, time);
    if (this.audio.readyState >= 1) {
      try { this.audio.currentTime = target; } catch { /* Audio seek can fail before metadata is ready. */ }
    }
    this.player.currentTime = target;
    this.updatePlayerUI();
    this.updateActiveLyrics(true);
  }

  setVolume(value) {
    const next = clamp(Number(value), 0, 1);
    this.audio.volume = Number.isFinite(next) ? next : 1;
    this.audio.muted = this.audio.volume === 0;
  }

  toggleMute() {
    if (this.audio.muted && this.audio.volume === 0) this.audio.volume = 1;
    else this.audio.muted = !this.audio.muted;
  }

  setSpeed(value) {
    const speed = Number(value);
    this.preferences.speed = SPEEDS.includes(speed) ? speed : 1;
    this.audio.playbackRate = this.preferences.speed;
    store(PLAYER_KEYS.speed, this.preferences.speed);
  }

  setFollow(value) {
    this.preferences.follow = Boolean(value);
    this.player.follow = this.preferences.follow;
    store(PLAYER_KEYS.follow, this.preferences.follow);
    this.updateActiveLyrics(true);
  }

  applyTheme(theme) {
    if (!THEMES.some((item) => item.id === theme)) return;
    const apply = () => {
      document.documentElement.dataset.theme = theme;
      store(THEME_STORAGE_KEY, theme);
      this.root.querySelectorAll('.theme-option').forEach((button) => {
        const selected = button.dataset.value === theme;
        button.setAttribute('aria-checked', String(selected));
        button.tabIndex = selected ? 0 : -1;
      });
    };
    this.runThemeTransition(apply);
  }

  applyMode(mode, origin) {
    const nextMode = mode === 'dark' ? 'dark' : 'light';
    if (document.documentElement.dataset.mode === nextMode) return;
    store(MODE_STORAGE_KEY, nextMode);
    const rect = origin?.getBoundingClientRect();
    document.documentElement.style.setProperty('--reveal-x', `${rect ? rect.left + rect.width / 2 : innerWidth / 2}px`);
    document.documentElement.style.setProperty('--reveal-y', `${rect ? rect.top + rect.height / 2 : innerHeight / 2}px`);
    this.runThemeTransition(() => {
      document.documentElement.dataset.mode = nextMode;
      const meta = document.querySelector('meta[name="theme-color"]');
      meta?.setAttribute('content', nextMode === 'dark' ? '#121214' : '#F7F6F2');
      const input = this.root.querySelector('#mode-switch');
      if (input) {
        input.checked = nextMode === 'dark';
        input.setAttribute('aria-checked', String(input.checked));
      }
    });
  }

  runThemeTransition(update) {
    const root = document.documentElement;
    if (this.motionReduced || typeof document.startViewTransition !== 'function') {
      update();
      return;
    }
    root.classList.add('theme-reveal');
    try {
      const transition = document.startViewTransition(update);
      transition.finished.finally(() => root.classList.remove('theme-reveal'));
    } catch {
      root.classList.remove('theme-reveal');
      update();
    }
  }

  handleClick(event) {
    const action = event.target.closest('[data-action]');
    if (!action || !this.root.contains(action)) return;
    const { action: command, value } = action.dataset;
    if (command === 'select-song') void this.selectSong(action.dataset.songId);
    if (command === 'back') this.openLibrary();
    if (command === 'toggle-play') void this.togglePlay();
    if (command === 'toggle-mute') this.toggleMute();
    if (command === 'seek-back') this.seek(this.audio.currentTime - 10);
    if (command === 'seek-forward') this.seek(this.audio.currentTime + 10);
    if (command === 'reset-filters') {
      this.filters = { ...EMPTY_FILTERS };
      for (const field of this.filterFields) this.filters[field.field] = '';
      this.renderLibrary();
    }
    if (command === 'theme') this.applyTheme(value);
    if (command === 'lyrics-line') this.seek(Number(action.dataset.time));
    if (command === 'mode') this.applyMode(action.checked ? 'dark' : 'light', action);
  }

  handleInput(event) {
    const target = event.target;
    if (target.id === 'song-search') this.scheduleSearch(target.value);
    if (target.dataset.action === 'seek') this.seek(Number(target.value));
  }

  handleChange(event) {
    const target = event.target;
    if (target.matches('[data-filter-field]')) {
      this.filters[target.dataset.filterField] = target.value;
      this.renderLibrary();
    }
    if (target.dataset.action === 'speed') this.setSpeed(target.value);
    if (target.dataset.action === 'follow') this.setFollow(target.checked);
    if (target.dataset.action === 'mode') this.applyMode(target.checked ? 'dark' : 'light', target);
  }

  handleKeyDown(event) {
    const target = event.target;
    if (target.matches('.lyrics-line[data-time]') && (event.key === 'Enter' || event.key === ' ')) {
      event.preventDefault();
      this.seek(Number(target.dataset.time));
    }
    if (target.matches('.theme-option')) {
      const index = THEMES.findIndex((item) => item.id === target.dataset.value);
      let next = index;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % THEMES.length;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index - 1 + THEMES.length) % THEMES.length;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = THEMES.length - 1;
      else return;
      event.preventDefault();
      this.applyTheme(THEMES[next].id);
      this.root.querySelector(`[data-value="${THEMES[next].id}"]`)?.focus();
    }
    if (target.id === 'mode-switch' && ['Enter', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      this.applyMode(document.documentElement.dataset.mode === 'dark' ? 'light' : 'dark', target);
    }
  }

  handleWindowKeyDown(event) {
    if (this.view !== 'player' || event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key !== 'm' && event.key !== 'M') return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    event.preventDefault();
    this.toggleMute();
  }

  handleStorage(event) {
    if (event.key === THEME_STORAGE_KEY && THEMES.some((theme) => theme.id === event.newValue)) this.applyTheme(event.newValue);
    if (event.key === MODE_STORAGE_KEY) this.applyMode(event.newValue === 'dark' ? 'dark' : 'light');
  }

  handlePointerMove(event) {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches || this.motionReduced) return;
    const play = event.target.closest('.play-button');
    if (play) {
      const rect = play.getBoundingClientRect();
      play.style.setProperty('--magnet-x', `${clamp(((event.clientX - rect.left) / rect.width - 0.5) * 20, -10, 10)}px`);
      play.style.setProperty('--magnet-y', `${clamp(((event.clientY - rect.top) / rect.height - 0.5) * 7, -5, 5)}px`);
    }
    const cover = event.target.closest('.player-cover');
    if (cover) {
      const rect = cover.getBoundingClientRect();
      cover.style.setProperty('--tilt-y', `${clamp(((event.clientX - rect.left) / rect.width - 0.5) * 10, -5, 5)}deg`);
      cover.style.setProperty('--tilt-x', `${clamp(-((event.clientY - rect.top) / rect.height - 0.5) * 10, -5, 5)}deg`);
    }
    const row = event.target.closest('.song-row');
    if (row) {
      const rect = row.getBoundingClientRect();
      row.style.setProperty('--glow-x', `${clamp((event.clientX - rect.left) / rect.width * 100, 0, 100)}%`);
      row.style.setProperty('--glow-y', `${clamp((event.clientY - rect.top) / rect.height * 100, 0, 100)}%`);
    }
  }

  handlePointerLeave(event) {
    const target = event.target;
    const play = target.closest?.('.play-button');
    if (play && !play.contains(event.relatedTarget)) {
      play.style.setProperty('--magnet-x', '0px');
      play.style.setProperty('--magnet-y', '0px');
    }
    const cover = target.closest?.('.player-cover');
    if (cover && !cover.contains(event.relatedTarget)) {
      cover.style.setProperty('--tilt-x', '0deg');
      cover.style.setProperty('--tilt-y', '0deg');
    }
    const row = target.closest?.('.song-row');
    if (row && !row.contains(event.relatedTarget)) {
      row.style.removeProperty('--glow-x');
      row.style.removeProperty('--glow-y');
    }
  }

  destroy() {
    window.clearTimeout(this.searchTimer);
    this.wakeSlider?.destroy();
    this.wakeSlider = null;
    this.lyricsRequest?.abort();
    for (const observer of this.observers) observer.disconnect();
    this.unsubscribeDurations?.();
    this.audio.pause();
    this.audio.removeEventListener('timeupdate', this.onTimeUpdate);
    this.audio.removeEventListener('progress', this.onProgress);
    this.audio.removeEventListener('loadedmetadata', this.onMetadata);
    this.audio.removeEventListener('durationchange', this.onMetadata);
    this.audio.removeEventListener('play', this.onPlay);
    this.audio.removeEventListener('pause', this.onPause);
    this.audio.removeEventListener('ended', this.onEnded);
    this.audio.removeEventListener('error', this.onAudioError);
    this.audio.removeEventListener('volumechange', this.onVolumeChange);
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('input', this.onInput);
    this.root.removeEventListener('change', this.onChange);
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerout', this.onPointerLeave);
    window.removeEventListener('keydown', this.onWindowKeyDown);
    window.removeEventListener('storage', this.onStorage);
  }
}