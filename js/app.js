import { fetchSongs } from './api.js';
import { setupSearch } from './search.js';
import { createPlayer } from './player.js';
import { createSongFilters } from './filters.js';
import { createRecommendations } from './recommendations.js';
import { createPopularityStore } from './popularity.js';
import {
  clearReveals,
  enableCardTilt,
  enableHeroParallax,
  reveal,
  withViewTransition
} from './motion.js';

const libraryView = document.querySelector('#library-view');
const playerView = document.querySelector('#player-view');
const songsList = document.querySelector('#songs-list');
const listStatus = document.querySelector('#list-status');
const songCount = document.querySelector('#song-count');
const searchInput = document.querySelector('#song-search');
const playerError = document.querySelector('#player-error');
let allSongs = [];
let loadedSongs = [];
let recommendations;

const popularity = createPopularityStore(() => {
  if (recommendations) {
    recommendations.setSongs(allSongs);
  }
});

const player = createPlayer({
  playerTitle: document.querySelector('#player-title'),
  playerArtist: document.querySelector('#player-artist'),
  playerError,
  playButton: document.querySelector('#play-button'),
  seekBack: document.querySelector('#seek-back'),
  seekForward: document.querySelector('#seek-forward'),
  progressSlider: document.querySelector('#progress-slider'),
  currentTime: document.querySelector('#current-time'),
  duration: document.querySelector('#duration'),
  muteButton: document.querySelector('#mute-button'),
  volumeSlider: document.querySelector('#volume-slider'),
  speedSelect: document.querySelector('#speed-select'),
  followLyrics: document.querySelector('#lyrics-follow')
});

function findCanonicalSong(song) {
  return allSongs.find((candidate) => candidate.id === song.id) ?? song;
}

function showPlayer(song) {
  const canonicalSong = findCanonicalSong(song);

  playerError.textContent = '';
  popularity.record(canonicalSong).catch((error) => {
    playerError.textContent = error.message;
  });
  player.load(canonicalSong);

  withViewTransition(() => {
    libraryView.hidden = true;
    playerView.hidden = false;
    // The new view must be captured at the top; the view transition supplies
    // the visual continuity, while reduced-motion users get an instant jump.
    window.scrollTo({ top: 0, behavior: 'auto' });
  });
}

function showLibrary() {
  player.stop();
  withViewTransition(() => {
    playerView.hidden = true;
    libraryView.hidden = false;
  });
}

recommendations = createRecommendations({
  container: document.querySelector('#recommendations'),
  onSelect: showPlayer,
  getPlayCount: popularity.getPlayCount
});

function renderSongs(songs) {
  clearReveals(songsList);
  songsList.replaceChildren();
  songCount.textContent = `${songs.length} ${songs.length === 1 ? 'piosenka' : 'piosenek'}`;

  if (songs.length === 0) {
    listStatus.dataset.state = 'empty';
    listStatus.textContent = 'Nie znaleziono piosenek';
    return;
  }

  delete listStatus.dataset.state;
  listStatus.textContent = '';
  songs.forEach((song) => {
    const row = document.createElement('article');
    row.className = 'song-row';

    const info = document.createElement('div');
    info.className = 'song-info';
    const title = document.createElement('h3');
    title.className = 'song-title';
    title.textContent = song.title;
    const artist = document.createElement('p');
    artist.className = 'song-artist';
    artist.textContent = song.artist;
    info.append(title, artist);

    const button = document.createElement('button');
    button.className = 'sing-button';
    button.type = 'button';
    button.textContent = 'Śpiewaj';
    button.setAttribute('aria-label', `Śpiewaj: ${song.title} - ${song.artist}`);
    button.addEventListener('click', () => showPlayer(song));

    row.append(info, button);
    songsList.append(row);
  });

  reveal(songsList.querySelectorAll('.song-row'));
}

const songFilters = createSongFilters({
  elements: {
    genre: document.querySelector('#genre-filter'),
    language: document.querySelector('#language-filter'),
    decade: document.querySelector('#decade-filter'),
    reset: document.querySelector('#reset-filters')
  },
  onChange: renderSongs
});

async function loadSongs(query = '') {
  songsList.setAttribute('aria-busy', 'true');
  listStatus.dataset.state = 'loading';
  listStatus.textContent = 'Ładowanie piosenek...';
  try {
    const results = await fetchSongs(query);

    if (query === '') {
      allSongs = results;
      loadedSongs = results;
      recommendations.setSongs(allSongs);
    } else {
      // Search narrows the setlist only; recommendations and the popular chart
      // stay anchored to the complete library and its canonical song objects.
      loadedSongs = results.map(findCanonicalSong);
    }

    songFilters.setSongs(loadedSongs);
    renderSongs(songFilters.getFilteredSongs());
  } catch (error) {
    if (query === '') {
      allSongs = [];
      recommendations.setSongs(allSongs);
    }

    loadedSongs = [];
    songFilters.setSongs(loadedSongs);
    songCount.textContent = '';
    clearReveals(songsList);
    songsList.replaceChildren();
    listStatus.dataset.state = 'error';
    listStatus.textContent = error.message;
  } finally {
    songsList.removeAttribute('aria-busy');
  }
}

setupSearch(searchInput, loadSongs);
document.querySelector('#back-button').addEventListener('click', showLibrary);
enableHeroParallax();
enableCardTilt();
loadSongs();
