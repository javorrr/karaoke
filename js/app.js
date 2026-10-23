import { fetchSongs } from './api.js';
import { setupSearch } from './search.js';
import { createPlayer } from './player.js';

const libraryView = document.querySelector('#library-view');
const playerView = document.querySelector('#player-view');
const songsList = document.querySelector('#songs-list');
const listStatus = document.querySelector('#list-status');
const songCount = document.querySelector('#song-count');
const searchInput = document.querySelector('#song-search');

const player = createPlayer({
  playerTitle: document.querySelector('#player-title'),
  playerArtist: document.querySelector('#player-artist'),
  playerError: document.querySelector('#player-error'),
  playButton: document.querySelector('#play-button'),
  progressSlider: document.querySelector('#progress-slider'),
  currentTime: document.querySelector('#current-time'),
  duration: document.querySelector('#duration')
});

function showPlayer(song) {
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

async function loadSongs(query = '') {
  listStatus.textContent = 'Ładowanie piosenek...';
  try {
    const songs = await fetchSongs(query);
    renderSongs(songs);
  } catch (error) {
    songCount.textContent = '';
    songsList.replaceChildren();
    listStatus.textContent = error.message;
  }
}

setupSearch(searchInput, loadSongs);
document.querySelector('#back-button').addEventListener('click', showLibrary);
loadSongs();