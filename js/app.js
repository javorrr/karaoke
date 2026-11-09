
import { fetchSongs } from './api.js';
import { setupSearch } from './search.js';
import { createPlayer } from './player.js';
import { createSongFilters } from './filters.js';
import { createRecommendations } from './recommendations.js';
import { createPopularityStore } from './popularity.js';

const libraryView = document.querySelector('#library-view');
const playerView = document.querySelector('#player-view');
const songsList = document.querySelector('#songs-list');
const listStatus = document.querySelector('#list-status');
const songCount = document.querySelector('#song-count');
const searchInput = document.querySelector('#song-search');
const playerError = document.querySelector('#player-error');
let loadedSongs = [];
let recommendations;

const popularity = createPopularityStore(() => {
  if (recommendations) {
    recommendations.setSongs(loadedSongs);
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

function showPlayer(song) {
  playerError.textContent = '';
  popularity.record(song).catch((error) => {
    playerError.textContent = error.message;
  });
  player.load(song);
  libraryView.hidden = true;
  playerView.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showLibrary() {
  player.stop();
  playerView.hidden = true;
  libraryView.hidden = false;
}

recommendations = createRecommendations({
  container: document.querySelector('#recommendations'),
  onSelect: showPlayer,
  getPlayCount: popularity.getPlayCount
});

function renderSongs(songs) {
  songsList.replaceChildren();
  songCount.textContent = `${songs.length} ${songs.length === 1 ? 'piosenka' : 'piosenek'}`;

  if (songs.length === 0) {
    listStatus.textContent = 'Nie znaleziono piosenek';
    return;
  }

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
  listStatus.textContent = 'Ładowanie piosenek...';
  try {
    loadedSongs = await fetchSongs(query);
    songFilters.setSongs(loadedSongs);
    recommendations.setSongs(loadedSongs);
    renderSongs(songFilters.getFilteredSongs());
  } catch (error) {
    loadedSongs = [];
    songFilters.setSongs(loadedSongs);
    recommendations.setSongs(loadedSongs);
    songCount.textContent = '';
    songsList.replaceChildren();
    listStatus.textContent = error.message;
  }
}

setupSearch(searchInput, loadSongs);
document.querySelector('#back-button').addEventListener('click', showLibrary);
loadSongs();