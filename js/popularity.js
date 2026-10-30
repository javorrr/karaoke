import { recordSongPlay } from './api.js';

export function createPopularityStore(onChange) {
  return {
    getPlayCount(song) {
      return Number(song.play_count) || 0;
    },
    async record(song) {
      song.play_count = await recordSongPlay(song.id);
      onChange();
    }
  };
}
