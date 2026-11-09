const SONG_METADATA = {
  'Last Christmas': { genre: 'Pop', language: 'Angielski', decade: '1980' },
  'W sumie nie jest źle': { genre: 'Pop', language: 'Polski', decade: '1970' },
};

const UNKNOWN_METADATA = {
  genre: 'Inne',
  language: 'Nie określono',
  decade: 'Nie określono',
};

export const FILTER_FIELDS = [
  { field: 'genre', label: 'Gatunek', emptyLabel: 'Wszystkie gatunki' },
  { field: 'language', label: 'Język', emptyLabel: 'Wszystkie języki' },
  { field: 'decade', label: 'Dekada', emptyLabel: 'Wszystkie dekady' },
];

const DETAIL_PREFIX = 'detail-';
const detailCache = new Map();

const text = (value) =>
  String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim();

const compareText = (first, second) =>
  first.localeCompare(second, 'pl', { numeric: true, sensitivity: 'base' });

const warnMalformed = (song, reason) => {
  if (typeof console === 'undefined' || typeof console.warn !== 'function') return;

  console.warn(
    `[karaoke] Nieprawidłowe details dla "${text(song?.title) || '?'}": ${reason}`
  );
};

export function slugifyLabel(value) {
  const slug = text(value)
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/ł/g, 'l')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return slug || 'grupa';
}

/**
 * Reads the optional per-track `details` slot.
 * Accepts `{"Label":"value"}` or `{"Label":["v1","v2"]}`. Anything malformed
 * is reported once and ignored so a single bad row can never break the library.
 */
export function parseSongDetails(song) {
  const raw = song?.details;

  if (raw === null || raw === undefined || raw === '') return {};

  const cacheKey = typeof raw === 'string' ? raw : null;
  if (cacheKey && detailCache.has(cacheKey)) return detailCache.get(cacheKey);

  const result = {};
  let parsed = raw;

  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw);
    } catch {
      warnMalformed(song, 'niepoprawny JSON');
      if (cacheKey) detailCache.set(cacheKey, result);
      return result;
    }
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    warnMalformed(song, 'oczekiwano obiektu JSON');
    if (cacheKey) detailCache.set(cacheKey, result);
    return result;
  }

  for (const [rawLabel, rawValue] of Object.entries(parsed)) {
    const label = text(rawLabel);

    if (!label) {
      warnMalformed(song, 'pusta nazwa grupy');
      continue;
    }

    const items = Array.isArray(rawValue) ? rawValue : [rawValue];
    const values = [];

    for (const item of items) {
      if (typeof item !== 'string' && typeof item !== 'number') {
        warnMalformed(song, `wartość grupy "${label}" musi być tekstem`);
        continue;
      }

      const value = text(item);
      if (value) values.push(value);
    }

    if (!values.length) {
      warnMalformed(song, `grupa "${label}" nie ma wartości`);
      continue;
    }

    const unique = [...new Set(values)].sort(compareText);
    result[label] = unique;
  }

  if (cacheKey) detailCache.set(cacheKey, result);

  return result;
}

export function isDetailField(field) {
  return typeof field === 'string' && field.startsWith(DETAIL_PREFIX);
}

export function getSongMetadata(song) {
  return SONG_METADATA[song?.title] || UNKNOWN_METADATA;
}

export function getSongDetailValues(song, label) {
  return parseSongDetails(song)[label] || [];
}

export function getMetadataOptions(field) {
  const values = Object.values(SONG_METADATA)
    .map((metadata) => metadata[field])
    .filter(Boolean);

  return [...new Set(values)].sort(compareText);
}

function getDetailOptions(songs, label) {
  const values = songs.flatMap((song) => getSongDetailValues(song, label));

  return [...new Set(values)].sort(compareText);
}

/**
 * Base fields stay exactly as they were; detail groups appear only when the
 * library actually carries a label. Everything is normalised and sorted.
 */
export function buildFilterFields(songs = []) {
  const groups = new Map();

  for (const song of songs) {
    for (const label of Object.keys(parseSongDetails(song))) {
      if (!groups.has(label)) groups.set(label, new Set());
      for (const value of getSongDetailValues(song, label)) {
        groups.get(label).add(value);
      }
    }
  }

  const usedKeys = new Set(FILTER_FIELDS.map(({ field }) => field));
  const detailFields = [...groups.entries()]
    .sort(([first], [second]) => compareText(first, second))
    .map(([label, values]) => {
      const base = `${DETAIL_PREFIX}${slugifyLabel(label)}`;
      let field = base;

      for (let index = 2; usedKeys.has(field); index += 1) {
        field = `${base}-${index}`;
      }

      usedKeys.add(field);

      return {
        field,
        label,
        detailLabel: label,
        emptyLabel: `Wszystkie: ${label}`,
        options: [...values].sort(compareText),
      };
    });

  return [
    ...FILTER_FIELDS.map((field) => ({
      ...field,
      options: getMetadataOptions(field.field),
    })),
    ...detailFields,
  ];
}

export function songMatchesFilter(song, filterField, value) {
  if (!value) return true;

  if (isDetailField(filterField?.field)) {
    return getSongDetailValues(song, filterField.detailLabel).includes(value);
  }

  return getSongMetadata(song)[filterField?.field] === value;
}
