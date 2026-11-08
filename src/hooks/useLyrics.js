import { useEffect, useMemo, useState } from 'react';
import { groupIntoPhrases, parseLRC } from '../lib/lrc.js';

function toTimedLines(lines, duration) {
  if (!lines.length || !lines.every((line) => line.time === null)) {
    return lines;
  }

  if (!Number.isFinite(duration) || duration <= 0) {
    return lines;
  }

  const interval = duration / lines.length;

  return lines.map((line, index) => ({ ...line, time: index * interval }));
}

export function useLyrics({ song, duration, currentTime }) {
  const [rawLines, setRawLines] = useState([]);
  const [status, setStatus] = useState('idle');

  useEffect(() => {
    if (!song) {
      setRawLines([]);
      setStatus('idle');
      return undefined;
    }

    let cancelled = false;
    setRawLines([]);
    setStatus('loading');

    const load = async () => {
      try {
        let content = '';

        if (song.lrc_url) {
          const response = await fetch(song.lrc_url);
          if (!response.ok) throw new Error('Brak pliku LRC');
          content = await response.text();
        } else if (song.title) {
          const params = new URLSearchParams({
            title: song.title,
            artist: song.artist || '',
          });
          const response = await fetch(`api/lyrics.php?${params}`);
          if (!response.ok) throw new Error('Brak tekstu LRCLIB');
          const data = await response.json();
          content = data.lyrics || '';
        } else {
          throw new Error('Brak danych piosenki');
        }

        if (cancelled) return;

        const parsed = parseLRC(content);

        if (!parsed.length) {
          setStatus('empty');
          return;
        }

        setRawLines(parsed);
        setStatus('ready');
      } catch {
        if (!cancelled) setStatus('error');
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [song, song?.id, song?.title, song?.artist, song?.lrc_url]);

  const lines = useMemo(
    () => toTimedLines(rawLines, duration),
    [duration, rawLines]
  );

  const phrases = useMemo(() => {
    return groupIntoPhrases(lines).map((phrase) =>
      phrase.map((line) => ({
        ...line,
        index: lines.indexOf(line),
      }))
    );
  }, [lines]);

  const activeIndex = useMemo(() => {
    let nextActive = -1;

    lines.forEach((line, index) => {
      if (Number.isFinite(line.time) && currentTime >= line.time) {
        nextActive = index;
      }
    });

    return nextActive;
  }, [currentTime, lines]);

  return { activeIndex, lines, phrases, status };
}
