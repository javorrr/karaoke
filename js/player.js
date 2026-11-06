import { createLyrics } from './lyrics.js';

const STORAGE_KEYS = {
  volume: 'karaoke:volume',
  muted: 'karaoke:muted',
  speed: 'karaoke:speed',
  followLyrics: 'karaoke:follow-lyrics'
};

const readStoredValue = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const storeValue = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Przechowywanie preferencji może być zablokowane (np. tryb prywatny).
  }
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function createPlayer(elements) {
  const audio = new Audio();
  audio.preload = 'metadata';

  const lyrics = createLyrics(document.querySelector('#lyrics-display'), {
    onSeek: (time) => seekTo(time)
  });

  let activeSong = null;
  let isScrubbing = false;
  let lyricsLoadId = 0;

  const storedVolumeValue = readStoredValue(STORAGE_KEYS.volume);
  const storedVolume = storedVolumeValue === null ? Number.NaN : Number(storedVolumeValue);
  let volume = Number.isFinite(storedVolume) && storedVolume >= 0 && storedVolume <= 1
    ? storedVolume
    : 1;
  let muted = readStoredValue(STORAGE_KEYS.muted) === 'true' || volume === 0;

  const storedSpeedValue = readStoredValue(STORAGE_KEYS.speed);
  const storedSpeed = storedSpeedValue === null ? Number.NaN : Number(storedSpeedValue);
  const initialSpeed = [0.5, 0.75, 1, 1.25, 1.5].includes(storedSpeed) ? storedSpeed : 1;
  const initialFollow = readStoredValue(STORAGE_KEYS.followLyrics) !== 'false';

  elements.speedSelect.value = String(initialSpeed);
  elements.followLyrics.checked = initialFollow;
  lyrics.setFollow(initialFollow);

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '00:00';
    const safeSeconds = Math.max(0, seconds);
    const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
    const remainder = Math.floor(safeSeconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  };

  const getDuration = () => (
    Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0
  );

  const setPlayingState = (isPlaying) => {
    elements.playButton.innerHTML = isPlaying ? '❚❚ <span>Pause</span>' : '▶ <span>Play</span>';
    elements.playButton.setAttribute('aria-label', isPlaying ? 'Wstrzymaj piosenkę' : 'Odtwórz piosenkę');
  };

  const updateMuteUi = () => {
    const effectivelyMuted = muted || volume === 0;
    const icon = effectivelyMuted ? '🔇' : (volume < 0.5 ? '🔈' : '🔊');

    elements.muteButton.textContent = icon;
    elements.muteButton.setAttribute('aria-pressed', String(muted));
    elements.muteButton.setAttribute('aria-label', muted ? 'Włącz dźwięk' : 'Wycisz dźwięk');
    elements.volumeSlider.value = String(volume);
    elements.volumeSlider.style.setProperty('--volume', `${volume * 100}%`);
    audio.volume = volume;
    audio.muted = muted;
  };

  const paintProgress = (time) => {
    const duration = getDuration();
    const progress = duration > 0 ? clamp(time / duration, 0, 1) * 100 : 0;
    elements.progressSlider.style.setProperty('--progress', `${progress}%`);
  };

  const paintBuffered = () => {
    const duration = getDuration();
    let bufferedEnd = 0;

    if (duration > 0 && audio.buffered.length) {
      for (let index = 0; index < audio.buffered.length; index += 1) {
        if (audio.buffered.start(index) <= audio.currentTime + 1) {
          bufferedEnd = Math.max(bufferedEnd, audio.buffered.end(index));
        }
      }
    }

    const buffered = duration > 0 ? clamp(bufferedEnd / duration, 0, 1) * 100 : 0;
    elements.progressSlider.style.setProperty('--buffered', `${buffered}%`);
  };

  const syncTimeline = (time, { updateLyrics = true } = {}) => {
    const duration = getDuration();
    const safeTime = duration > 0 ? clamp(time, 0, duration) : Math.max(0, time);

    elements.progressSlider.value = String(safeTime);
    elements.currentTime.textContent = formatTime(safeTime);

    if (updateLyrics) {
      lyrics.update(safeTime);
    }

    paintProgress(safeTime);
    paintBuffered();
  };

  const applyDuration = () => {
    if (!getDuration()) return;

    elements.progressSlider.max = String(audio.duration);
    elements.progressSlider.disabled = false;
    elements.duration.textContent = formatTime(audio.duration);
    lyrics.setDuration(audio.duration);
  };

  const seekTo = (time) => {
    const duration = getDuration();
    const target = duration > 0 ? clamp(time, 0, duration) : Math.max(0, time);

    if (audio.readyState >= 1) {
      try {
        audio.currentTime = target;
      } catch {
        // Niektóre przeglądarki mogą chwilowo odrzucić skok przed wczytaniem metadanych.
      }
    }

    syncTimeline(target);
  };

  const seekBy = (offset) => {
    if (!activeSong) return;
    seekTo((Number.isFinite(audio.currentTime) ? audio.currentTime : 0) + offset);
  };

  const finishScrubbing = () => {
    if (!isScrubbing) return;

    isScrubbing = false;
    const target = Number(elements.progressSlider.value);

    if (Number.isFinite(target)) {
      try {
        audio.currentTime = target;
      } catch {
        // Ignorujemy błąd skoku; interfejs nadal pokaże wybraną pozycję.
      }
      syncTimeline(target);
    }

    paintBuffered();
  };

  audio.volume = volume;
  audio.muted = muted;
  audio.playbackRate = initialSpeed;
  updateMuteUi();

  audio.addEventListener('loadedmetadata', applyDuration);
  audio.addEventListener('durationchange', applyDuration);

  audio.addEventListener('timeupdate', () => {
    if (isScrubbing) return;
    syncTimeline(audio.currentTime);
  });

  audio.addEventListener('seeking', () => {
    if (!isScrubbing) {
      elements.currentTime.textContent = formatTime(audio.currentTime);
    }
  });

  audio.addEventListener('seeked', () => {
    if (!isScrubbing) {
      syncTimeline(audio.currentTime);
    }
  });

  audio.addEventListener('progress', paintBuffered);

  audio.addEventListener('play', () => {
    setPlayingState(true);
  });

  audio.addEventListener('pause', () => {
    setPlayingState(false);
  });

  audio.addEventListener('ended', () => {
    setPlayingState(false);
    audio.currentTime = 0;
    syncTimeline(0);
  });

  audio.addEventListener('error', () => {
    setPlayingState(false);
    elements.progressSlider.disabled = true;
    elements.playerError.textContent = 'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.';
  });

  elements.playButton.addEventListener('click', async () => {
    if (!activeSong) return;
    elements.playerError.textContent = '';

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        elements.playerError.textContent = 'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.';
        setPlayingState(false);
      }
    } else {
      audio.pause();
    }
  });

  elements.progressSlider.addEventListener('pointerdown', () => {
    isScrubbing = true;
  });

  elements.progressSlider.addEventListener('input', () => {
    const target = Number(elements.progressSlider.value);

    if (!Number.isFinite(target)) return;

    elements.currentTime.textContent = formatTime(target);
    lyrics.update(target);
    paintProgress(target);

    if (audio.readyState >= 1) {
      try {
        audio.currentTime = target;
      } catch {
        // Aktualizacja tekstu i czasu działa nawet, gdy skok audio jest chwilowo niedostępny.
      }
    }
  });

  elements.progressSlider.addEventListener('change', finishScrubbing);
  elements.progressSlider.addEventListener('pointerup', finishScrubbing);
  elements.progressSlider.addEventListener('pointercancel', finishScrubbing);
  window.addEventListener('pointerup', finishScrubbing);

  elements.seekBack.addEventListener('click', () => seekBy(-10));
  elements.seekForward.addEventListener('click', () => seekBy(10));

  elements.muteButton.addEventListener('click', () => {
    if (muted && volume === 0) {
      volume = 1;
      muted = false;
    } else {
      muted = !muted;
    }

    updateMuteUi();
    storeValue(STORAGE_KEYS.muted, String(muted));
    storeValue(STORAGE_KEYS.volume, String(volume));
  });

  elements.volumeSlider.addEventListener('input', () => {
    volume = Number(elements.volumeSlider.value);

    if (!Number.isFinite(volume)) {
      volume = 1;
    }

    muted = volume === 0;
    updateMuteUi();
    storeValue(STORAGE_KEYS.volume, String(volume));
    storeValue(STORAGE_KEYS.muted, String(muted));
  });

  elements.speedSelect.addEventListener('change', () => {
    const speed = Number(elements.speedSelect.value);
    audio.playbackRate = Number.isFinite(speed) ? speed : 1;
    storeValue(STORAGE_KEYS.speed, String(audio.playbackRate));
  });

  elements.followLyrics.addEventListener('change', () => {
    lyrics.setFollow(elements.followLyrics.checked);
    storeValue(STORAGE_KEYS.followLyrics, String(elements.followLyrics.checked));
  });

  return {
    load(song) {
      activeSong = song;
      lyricsLoadId += 1;
      const currentLyricsLoadId = lyricsLoadId;

      elements.playerTitle.textContent = song.title;
      elements.playerArtist.textContent = song.artist;
      elements.playerError.textContent = '';
      elements.progressSlider.max = '0';
      elements.progressSlider.value = '0';
      elements.progressSlider.disabled = true;
      elements.progressSlider.style.setProperty('--progress', '0%');
      elements.progressSlider.style.setProperty('--buffered', '0%');
      elements.duration.textContent = '00:00';
      elements.currentTime.textContent = '00:00';
      setPlayingState(false);

      audio.src = song.stream_url || song.audio_url;
      audio.load();
      audio.playbackRate = Number(elements.speedSelect.value) || 1;

      lyrics.load(song.lrc_url, song).then(() => {
        if (currentLyricsLoadId !== lyricsLoadId) return;
        lyrics.setDuration(getDuration());
        lyrics.update(0);
      });
    },
    stop() {
      audio.pause();
    }
  };
}
