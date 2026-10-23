export function createPlayer(elements) {
  const audio = new Audio();
  let activeSong = null;

  const formatTime = (seconds) => {
    if (!Number.isFinite(seconds)) return '00:00';
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const remainder = Math.floor(seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${remainder}`;
  };

  const setPlayingState = (isPlaying) => {
    elements.playButton.innerHTML = isPlaying ? '❚❚ <span>Pause</span>' : '▶ <span>Play</span>';
    elements.playButton.setAttribute('aria-label', isPlaying ? 'Wstrzymaj piosenkę' : 'Odtwórz piosenkę');
  };

  const resetProgress = () => {
    elements.progressSlider.value = '0';
    elements.currentTime.textContent = '00:00';
  };

  audio.addEventListener('loadedmetadata', () => {
    elements.progressSlider.max = audio.duration;
    elements.duration.textContent = formatTime(audio.duration);
  });

  audio.addEventListener('timeupdate', () => {
    elements.progressSlider.value = audio.currentTime;
    elements.currentTime.textContent = formatTime(audio.currentTime);
  });

  audio.addEventListener('play', () => setPlayingState(true));
  audio.addEventListener('pause', () => setPlayingState(false));
  audio.addEventListener('ended', () => {
    setPlayingState(false);
    audio.currentTime = 0;
    resetProgress();
  });
  audio.addEventListener('error', () => {
    setPlayingState(false);
    elements.playerError.textContent = 'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.';
  });

  elements.playButton.addEventListener('click', async () => {
    if (!activeSong) return;
    elements.playerError.textContent = '';
    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        elements.playerError.textContent = 'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.';
        setPlayingState(false);
      }
    } else {
      audio.pause();
    }
  });

  elements.progressSlider.addEventListener('input', () => {
    audio.currentTime = Number(elements.progressSlider.value);
    elements.currentTime.textContent = formatTime(audio.currentTime);
  });

  return {
    load(song) {
      activeSong = song;
      elements.playerTitle.textContent = song.title;
      elements.playerArtist.textContent = song.artist;
      elements.playerError.textContent = '';
      audio.src = song.audio_url;
      audio.load();
      elements.progressSlider.max = '0';
      elements.duration.textContent = '00:00';
      resetProgress();
      setPlayingState(false);
    },
    stop() {
      audio.pause();
    }
  };
}