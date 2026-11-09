/* Deterministic generated cover art. No network images, no layout shift:
   every song gets the same gradient and monogram on every render. */

const hashString = (value) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

export function getCoverStyle(song) {
  const hash = hashString(`${song?.title ?? ''}${song?.artist ?? ''}`);
  const hue = hash % 360;
  const hueB = (hue + 38 + (hash % 24)) % 360;
  const saturation = 34 + (hash % 20);

  return {
    '--cover-a': `hsl(${hue} ${saturation}% 18%)`,
    '--cover-b': `hsl(${hueB} ${saturation + 10}% 34%)`,
    '--cover-c': `hsl(${hue} 74% 60%)`,
    '--cover-ink': '#fdfcf9',
  };
}

export function getMonogram(song) {
  const words = `${song?.title ?? ''}`
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (!words.length) return '#';

  return words
    .map((word) => word.replace(/[^\p{L}\p{N}]/gu, '').charAt(0))
    .join('')
    .toLocaleUpperCase('pl');
}

export function formatSongDuration(value) {
  const seconds = Number(value);

  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';

  const total = Math.floor(seconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = total % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainder
      .toString()
      .padStart(2, '0')}`;
  }

  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function durationLabel(value) {
  const formatted = formatSongDuration(value);

  return formatted === '--:--'
    ? 'Czas trwania nieznany'
    : `Czas trwania ${formatted}`;
}
