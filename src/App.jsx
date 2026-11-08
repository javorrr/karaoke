import { useState } from 'react';
import { Header } from './components/Header.jsx';
import { LibraryView } from './components/LibraryView.jsx';
import { PlayerView } from './components/PlayerView.jsx';
import { useAudioPlayer } from './hooks/useAudioPlayer.js';
import { useLyrics } from './hooks/useLyrics.js';
import { useSongLibrary } from './hooks/useSongLibrary.js';
import { useViewTransition } from './hooks/useViewTransition.js';

export default function App() {
  const library = useSongLibrary();
  const player = useAudioPlayer();
  const [view, setView] = useState('library');
  const [activeSong, setActiveSong] = useState(null);
  const startViewTransition = useViewTransition();
  const lyrics = useLyrics({
    song: activeSong,
    duration: player.duration,
    currentTime: player.currentTime,
  });

  const openSong = (song) => {
    const canonicalSong =
      library.allSongs.find((candidate) => candidate.id === song.id) ?? song;

    player.load(canonicalSong);
    setActiveSong(canonicalSong);
    library.recordPlay(canonicalSong).catch((error) => {
      player.setError(error.message);
    });

    startViewTransition(() => {
      setView('player');
      window.scrollTo({ top: 0, behavior: 'auto' });
    });
  };

  const openLibrary = () => {
    player.stop();
    startViewTransition(() => {
      setView('library');
    });
  };

  return (
    <>
      <a className="skip-link" href="#main-content">
        Przejdź do treści
      </a>
      <Header />
      <main className="container" id="main-content" tabIndex={-1}>
        <LibraryView
          hidden={view !== 'library'}
          library={library}
          onSelect={openSong}
        />
        <PlayerView
          activeSong={activeSong}
          hidden={view !== 'player'}
          lyrics={lyrics}
          onBack={openLibrary}
          player={player}
        />
      </main>
    </>
  );
}
