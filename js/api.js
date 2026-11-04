const API_URL = 'api/songs.php';
const PLAY_API_URL = 'api/song-play.php';

export async function fetchSongs(query = '') {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const response = await fetch(`${API_URL}${suffix}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Nie udało się pobrać piosenek.');
  }

  return data;
}

export async function recordSongPlay(songId) {
  const response = await fetch(PLAY_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ song_id: songId })
  });
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Nie udało się zaktualizować popularności piosenki.');
  }

  return data.play_count;
}