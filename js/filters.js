import { getMetadataOptions, getSongMetadata } from './song-metadata.js';

const FILTER_FIELDS = [
  { field: 'genre', label: 'Gatunek', emptyLabel: 'Wszystkie gatunki' },
  { field: 'language', label: 'Język', emptyLabel: 'Wszystkie języki' },
  { field: 'decade', label: 'Dekada', emptyLabel: 'Wszystkie dekady' }
];

function createOption(value, label) {
  const option = document.createElement('option');
  option.value = value;
  option.textContent = label;
  return option;
}

export function createSongFilters({ elements, onChange }) {
  const selectedFilters = {
    genre: '',
    language: '',
    decade: ''
  };
  let songs = [];

  FILTER_FIELDS.forEach(({ field, emptyLabel }) => {
    const select = elements[field];
    select.replaceChildren(createOption('', emptyLabel));

    getMetadataOptions(field).forEach((value) => {
      select.append(createOption(value, value));
    });

    select.addEventListener('change', () => {
      selectedFilters[field] = select.value;
      updateResetButton();
      onChange(filterSongs());
    });
  });

  function filterSongs() {
    return songs.filter((song) => {
      const metadata = getSongMetadata(song);
      return FILTER_FIELDS.every(({ field }) => (
        selectedFilters[field] === '' || metadata[field] === selectedFilters[field]
      ));
    });
  }

  function updateResetButton() {
    const hasActiveFilter = Object.values(selectedFilters).some(Boolean);
    elements.reset.disabled = !hasActiveFilter;
    elements.reset.setAttribute('aria-disabled', String(!hasActiveFilter));
  }

  elements.reset.addEventListener('click', () => {
    FILTER_FIELDS.forEach(({ field }) => {
      selectedFilters[field] = '';
      elements[field].value = '';
    });
    updateResetButton();
    onChange(filterSongs());
  });

  updateResetButton();

  return {
    setSongs(nextSongs) {
      songs = nextSongs;
    },
    getFilteredSongs: filterSongs
  };
}
