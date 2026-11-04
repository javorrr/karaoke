const SONG_METADATA = {
  'Last Christmas': { genre: 'Pop', language: 'Angielski', decade: '1980' },
  'W sumie nie jest źle': { genre: 'Pop', language: 'Polski', decade: '1970' }
};

const UNKNOWN_METADATA = {
  genre: 'Inne',
  language: 'Nie określono',
  decade: 'Nie określono'
};

export function getSongMetadata(song) {
  return SONG_METADATA[song.title] || UNKNOWN_METADATA;
}

export function getMetadataOptions(field) {
  const values = Object.values(SONG_METADATA)
    .map((metadata) => metadata[field])
    .filter(Boolean);

  return [...new Set(values)].sort((first, second) =>
    first.localeCompare(second, 'pl', { numeric: true })
  );
}
