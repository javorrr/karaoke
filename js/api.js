const API_URL = 'api/songs.php';

export async function fetchSongs(query = '') {
  const suffix = query ? `?q=${encodeURIComponent(query)}` : '';
  const response = await fetch(`${API_URL}${suffix}`);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || 'Nie udało się pobrać piosenek.');
  }

  return data;
}