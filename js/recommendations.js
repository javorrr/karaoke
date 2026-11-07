import { clearReveals, reveal } from './motion.js';

const MAX_RECOMMENDED_SONGS = 3;
const MAX_POPULAR_SONGS = 5;

function createSongButton(song, className, onSelect) {
  const button = document.createElement('button');
  button.className = className;
  button.type = 'button';
  const title = document.createElement('span');
  title.className = 'recommendation-song-title';
  title.textContent = song.title;
  const artist = document.createElement('span');
  artist.className = 'recommendation-song-artist';
  artist.textContent = song.artist;
  button.append(title, document.createTextNode(' '), artist);
  button.setAttribute('aria-label', `Śpiewaj: ${song.title} - ${song.artist}`);
  button.addEventListener('click', () => onSelect(song));
  return button;
}

function createPopularItem(song, playCount, position, onSelect) {
  const item = document.createElement('li');
  item.className = 'popular-song';

  const rank = document.createElement('span');
  rank.className = 'popular-rank';
  rank.textContent = String(position);

  const details = document.createElement('span');
  details.className = 'popular-details';
  const title = document.createElement('strong');
  title.textContent = song.title;
  const artist = document.createElement('span');
  artist.textContent = song.artist;
  details.append(title, artist);

  const plays = document.createElement('span');
  plays.className = 'popular-plays';
  plays.textContent = `${playCount} ${playCount === 1 ? 'śpiewanie' : 'śpiewań'}`;

  const button = document.createElement('button');
  button.className = 'popular-sing-button';
  button.type = 'button';
  button.textContent = 'Śpiewaj';
  button.setAttribute('aria-label', `Śpiewaj: ${song.title} - ${song.artist}`);
  button.addEventListener('click', () => onSelect(song));

  item.append(rank, details, plays, button);
  return item;
}

export function createRecommendations({ container, onSelect, getPlayCount }) {
  return {
    setSongs(songs) {
      const songsWithCounts = songs.map((song, index) => ({
        song,
        index,
        playCount: getPlayCount(song)
      }));
      const sortedSongs = [...songsWithCounts].sort((first, second) =>
        second.playCount - first.playCount || first.index - second.index
      );
      const recommendedSongs = sortedSongs.slice(0, MAX_RECOMMENDED_SONGS);
      const popularSongs = sortedSongs.slice(0, MAX_POPULAR_SONGS);

      clearReveals(container);
      container.replaceChildren();
      if (recommendedSongs.length === 0 && popularSongs.length === 0) {
        container.hidden = true;
        return;
      }

      container.hidden = false;
      const recommendedSection = document.createElement('section');
      recommendedSection.className = 'recommendation-group';
      recommendedSection.setAttribute('aria-labelledby', 'recommended-title');
      const recommendedTitle = document.createElement('h2');
      recommendedTitle.id = 'recommended-title';
      recommendedTitle.textContent = 'Polecane piosenki';
      const recommendedList = document.createElement('div');
      recommendedList.className = 'recommended-list';
      recommendedSongs.forEach(({ song }) => {
        recommendedList.append(createSongButton(song, 'recommended-song', onSelect));
      });
      recommendedSection.append(recommendedTitle, recommendedList);

      const popularSection = document.createElement('section');
      popularSection.className = 'recommendation-group';
      popularSection.setAttribute('aria-labelledby', 'popular-title');
      const popularTitle = document.createElement('h2');
      popularTitle.id = 'popular-title';
      popularTitle.textContent = 'Najchętniej śpiewane';
      const popularList = document.createElement('ol');
      popularList.className = 'popular-list';
      popularSongs.forEach(({ song, playCount }, index) => {
        popularList.append(createPopularItem(song, playCount, index + 1, onSelect));
      });
      popularSection.append(popularTitle, popularList);

      container.append(recommendedSection, popularSection);
      reveal(container.querySelectorAll('.recommended-song, .popular-song'));
    }
  };
}
