import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEYS = {
  volume: 'karaoke:volume',
  muted: 'karaoke:muted',
  speed: 'karaoke:speed',
  followLyrics: 'karaoke:follow-lyrics',
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5];
const AUDIO_ERROR =
  'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const readStored = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const store = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Preferencje mogą być zablokowane w trybie prywatnym.
  }
};

const readInitialPreferences = () => {
  const storedVolume = readStored(STORAGE_KEYS.volume);
  const volumeValue = storedVolume === null ? Number.NaN : Number(storedVolume);
  const volume =
    Number.isFinite(volumeValue) && volumeValue >= 0 && volumeValue <= 1
      ? volumeValue
      : 1;
  const muted = readStored(STORAGE_KEYS.muted) === 'true' || volume === 0;

  const storedSpeed = readStored(STORAGE_KEYS.speed);
  const speedValue = storedSpeed === null ? Number.NaN : Number(storedSpeed);

  return {
    volume,
    muted,
    speed: SPEEDS.includes(speedValue) ? speedValue : 1,
    follow: readStored(STORAGE_KEYS.followLyrics) !== 'false',
  };
};

const readBuffered = (audio, duration) => {
  if (!duration || !audio.buffered.length) return 0;

  let bufferedEnd = 0;

  for (let index = 0; index < audio.buffered.length; index += 1) {
    if (audio.buffered.start(index) <= audio.currentTime + 1) {
      bufferedEnd = Math.max(bufferedEnd, audio.buffered.end(index));
    }
  }

  return clamp(bufferedEnd / duration, 0, 1) * 100;
};

export function useAudioPlayer() {
  const [audio] = useState(() => new Audio());
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState('');
  const [failed, setFailed] = useState(false);
  const [preferences, setPreferences] = useState(readInitialPreferences);
  const activeSongRef = useRef(null);
  const durationRef = useRef(0);
  const speedRef = useRef(preferences.speed);

  durationRef.current = duration;
  speedRef.current = preferences.speed;

  const updateDuration = useCallback(() => {
    const nextDuration =
      Number.isFinite(audio.duration) && audio.duration > 0
        ? audio.duration
        : 0;

    durationRef.current = nextDuration;
    setDuration(nextDuration);
    setCurrentTime(audio.currentTime || 0);
    setBuffered(readBuffered(audio, nextDuration));
  }, [audio]);

  useEffect(() => {
    audio.preload = 'metadata';
    audio.volume = preferences.volume;
    audio.muted = preferences.muted;
    audio.playbackRate = preferences.speed;

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const handleProgress = () => {
      setBuffered(readBuffered(audio, durationRef.current));
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      audio.currentTime = 0;
      setCurrentTime(0);
    };
    const handleError = () => {
      setIsPlaying(false);
      setFailed(true);
      setError(AUDIO_ERROR);
    };

    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('progress', handleProgress);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('progress', handleProgress);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
    // The audio element is stable for the lifetime of the hook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audio, updateDuration]);

  useEffect(() => {
    audio.volume = preferences.volume;
  }, [audio, preferences.volume]);

  useEffect(() => {
    audio.muted = preferences.muted;
  }, [audio, preferences.muted]);

  useEffect(() => {
    audio.playbackRate = preferences.speed;
  }, [audio, preferences.speed]);

  const load = useCallback(
    (song) => {
      activeSongRef.current = song;
      setError('');
      setFailed(false);
      setCurrentTime(0);
      setDuration(0);
      durationRef.current = 0;
      setBuffered(0);
      setIsPlaying(false);

      audio.pause();
      audio.src = song.stream_url || song.audio_url;
      audio.load();
      audio.playbackRate = speedRef.current;
    },
    [audio]
  );

  const togglePlay = useCallback(async () => {
    if (!activeSongRef.current) return;

    setError('');

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setError(AUDIO_ERROR);
        setIsPlaying(false);
      }
    } else {
      audio.pause();
    }
  }, [audio]);

  const seek = useCallback(
    (time) => {
      const currentDuration =
        Number.isFinite(audio.duration) && audio.duration > 0
          ? audio.duration
          : durationRef.current;
      const target =
        currentDuration > 0
          ? clamp(time, 0, currentDuration)
          : Math.max(0, time);

      if (audio.readyState >= 1) {
        try {
          audio.currentTime = target;
        } catch {
          // Interfejs nadal pokazuje wybraną pozycję.
        }
      }

      setCurrentTime(target);
    },
    [audio]
  );

  const seekBy = useCallback(
    (offset) => {
      const base = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
      seek(base + offset);
    },
    [audio, seek]
  );

  const updateVolume = useCallback((value) => {
    const nextVolume = clamp(Number(value), 0, 1);
    const safeVolume = Number.isFinite(nextVolume) ? nextVolume : 1;

    setPreferences((current) => {
      const next = {
        ...current,
        volume: safeVolume,
        muted: safeVolume === 0,
      };
      store(STORAGE_KEYS.volume, String(next.volume));
      store(STORAGE_KEYS.muted, String(next.muted));
      return next;
    });
  }, []);

  const toggleMute = useCallback(() => {
    setPreferences((current) => {
      const recovering = current.muted && current.volume === 0;
      const next = {
        ...current,
        volume: recovering ? 1 : current.volume,
        muted: recovering ? false : !current.muted,
      };
      store(STORAGE_KEYS.muted, String(next.muted));
      store(STORAGE_KEYS.volume, String(next.volume));
      return next;
    });
  }, []);

  const updateSpeed = useCallback((value) => {
    const nextSpeed = Number(value);
    const safeSpeed = SPEEDS.includes(nextSpeed) ? nextSpeed : 1;

    setPreferences((current) => ({ ...current, speed: safeSpeed }));
    store(STORAGE_KEYS.speed, String(safeSpeed));
  }, []);

  const updateFollow = useCallback((value) => {
    const follow = Boolean(value);
    setPreferences((current) => ({ ...current, follow }));
    store(STORAGE_KEYS.followLyrics, String(follow));
  }, []);

  const stop = useCallback(() => {
    audio.pause();
  }, [audio]);

  return {
    buffered,
    currentTime,
    duration,
    error,
    failed,
    follow: preferences.follow,
    isPlaying,
    muted: preferences.muted,
    setError,
    setFollow: updateFollow,
    setSpeed: updateSpeed,
    setVolume: updateVolume,
    seek,
    seekBy,
    speed: preferences.speed,
    stop,
    toggleMute,
    togglePlay,
    load,
    volume: preferences.volume,
  };
}
