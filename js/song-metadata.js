const SONG_METADATA = {
  'Blask na scenie': { genre: 'Pop', language: 'Polski', decade: '2020' },
  'Cisza przed refrenem': { genre: 'Rock', language: 'Polski', decade: '2010' },
  'Dalej niż wczoraj': { genre: 'Pop', language: 'Polski', decade: '2020' },
  'Głośniej niż deszcz': { genre: 'Rock', language: 'Polski', decade: '2010' },
  'Kolorowy rytm': { genre: 'Dance', language: 'Polski', decade: '2020' },
  'Melodia nocy': { genre: 'Elektroniczna', language: 'Polski', decade: '2010' },
  'Ostatni takt': { genre: 'Ballada', language: 'Polski', decade: '2020' },
  'Światła miasta': { genre: 'Pop', language: 'Polski', decade: '2010' }
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
