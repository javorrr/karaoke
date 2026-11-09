import { useEffect, useState } from 'react';
import Lenis from 'lenis';
import { flushSync } from 'react-dom';
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
  const [transitionSongId, setTransitionSongId] = useState(null);
  const startViewTransition = useViewTransition();
  const lyrics = useLyrics({
    song: activeSong,
    duration: player.duration,
    currentTime: player.currentTime,
  });

  const toggleMute = player.toggleMute;

  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      anchors: true,
      respectReducedMotion: true,
    });
    const root = document.documentElement;
    const publishProgress = (instance) => {
      const progress = Number.isFinite(instance.progress) ? instance.progress : 0;
      root.style.setProperty('--lenis-progress', progress.toFixed(4));
    };

    lenis.on('scroll', publishProgress);
    publishProgress(lenis);
    window.__lenis = lenis;

    return () => {
      lenis.off('scroll', publishProgress);
      lenis.destroy();
      delete window.__lenis;
      root.style.removeProperty('--lenis-progress');
    };
  }, []);

  useEffect(() => {
    if (view !== 'player') return undefined;

    const handleKeyDown = (event) => {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.altKey
      ) {
        return;
      }

      if (event.key !== 'm' && event.key !== 'M') return;

      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }

      event.preventDefault();
      toggleMute();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleMute, view]);

  const openSong = (song) => {
    const canonicalSong =
      library.allSongs.find((candidate) => candidate.id === song.id) ?? song;

    flushSync(() => {
      setTransitionSongId(canonicalSong.id);
      player.load(canonicalSong);
      setActiveSong(canonicalSong);
    });

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
          activeSongId={activeSong?.id}
          isPlaying={player.isPlaying}
          transitionSongId={transitionSongId}
        />
        <PlayerView
          activeSong={activeSong}
          hidden={view !== 'player'}
          isPlaying={player.isPlaying}
          lyrics={lyrics}
          onBack={openLibrary}
          player={player}
        />
      </main>
    </>
  );
}
