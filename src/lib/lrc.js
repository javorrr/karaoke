export function parseLRC(content) {
  const parsed = [];
  const plainText = [];

  content.split(/\r?\n/).forEach((line) => {
    const matches = [
      ...line.matchAll(/\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g),
    ];
    const text = line.replace(/\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, '').trim();

    if (!matches.length && text) {
      plainText.push(text);
    }

    matches.forEach((match) => {
      const fraction = match[3] ? Number(`0.${match[3]}`) : 0;

      parsed.push({
        time: Number(match[1]) * 60 + Number(match[2]) + fraction,
        text,
      });
    });
  });

  if (parsed.length) {
    return parsed.sort((first, second) => first.time - second.time);
  }

  return plainText.map((text) => ({ time: null, text }));
}

export function groupIntoPhrases(entries) {
  const phrases = [];
  let phrase = [];

  entries.forEach((entry, index) => {
    phrase.push(entry);

    const nextEntry = entries[index + 1];
    const endsWithPunctuation = /[,.!?…]$/.test(entry.text);
    const hasPause = nextEntry && nextEntry.time - entry.time >= 1.5;

    if (!nextEntry || endsWithPunctuation || hasPause) {
      phrases.push(phrase);
      phrase = [];
    }
  });

  return phrases;
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '00:00';

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60).toString().padStart(2, '0');
  const remainder = Math.floor(safeSeconds % 60).toString().padStart(2, '0');

  return `${minutes}:${remainder}`;
}
