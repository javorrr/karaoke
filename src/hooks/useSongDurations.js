import { useCallback, useEffect, useRef, useState } from 'react';
import {
  getCachedDuration,
  requestDuration,
  subscribeDurations,
} from '../lib/durations.js';

const sourceOf = (song) => song?.stream_url || song?.audio_url || '';

const durationOf = (song) => {
  const value = Number(song?.duration);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const cachedFor = (songs) => {
  const next = {};

  for (const song of songs) {
    const source = sourceOf(song);
    const seconds = getCachedDuration(source);
    if (seconds !== null) next[source] = seconds;
  }

  return next;
};

export function useSongDurations(songs) {
  const [durations, setDurations] = useState(() => cachedFor(songs));
  const durationsRef = useRef(durations);
  durationsRef.current = durations;

  useEffect(
    () =>
      subscribeDurations((url, seconds) => {
        if (seconds === null) return;
        setDurations((current) =>
          current[url] === seconds ? current : { ...current, [url]: seconds }
        );
      }),
    []
  );

  useEffect(() => {
    setDurations((current) => {
      let next = current;

      for (const song of songs) {
        const source = sourceOf(song);
        const seconds = getCachedDuration(source);

        if (seconds !== null && next[source] !== seconds) {
          if (next === current) next = { ...current };
          next[source] = seconds;
        }
      }

      return next;
    });
  }, [songs]);

  const durationFor = useCallback(
    (song) => durations[sourceOf(song)] ?? durationOf(song),
    [durations]
  );

  const request = useCallback((url) => {
    if (!url) return;
    void requestDuration(url);
  }, []);

  return { durationFor, requestDuration: request };
}
