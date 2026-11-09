import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchSongs, recordSongPlay } from '../lib/api.js';
import {
  buildFilterFields,
  songMatchesFilter,
} from '../lib/songMetadata.js';

const EMPTY_FILTERS = { genre: '', language: '', decade: '' };
const MAX_RECOMMENDATIONS = 3;
const SEARCH_DEBOUNCE = 300;

const countLabel = (count) =>
  `${count} ${count === 1 ? 'piosenka' : 'piosenek'}`;

export function useSongLibrary() {
  const [allSongs, setAllSongs] = useState([]);
  const [loadedSongs, setLoadedSongs] = useState([]);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const allSongsRef = useRef([]);
  const requestRef = useRef(0);
  const firstLoadRef = useRef(true);

  const loadSongs = useCallback(async (nextQuery) => {
    const requestId = ++requestRef.current;
    setIsLoading(true);
    setError('');

    try {
      const results = await fetchSongs(nextQuery);

      if (requestId !== requestRef.current) return;

      if (nextQuery === '') {
        allSongsRef.current = results;
        setAllSongs(results);
        setLoadedSongs(results);
      } else {
        const canonicalResults = results.map((song) => {
          return (
            allSongsRef.current.find((candidate) => candidate.id === song.id) ??
            song
          );
        });
        setLoadedSongs(canonicalResults);
      }
    } catch (caught) {
      if (requestId !== requestRef.current) return;

      if (nextQuery === '') {
        allSongsRef.current = [];
        setAllSongs([]);
      }

      setLoadedSongs([]);
      setError(caught.message);
    } finally {
      if (requestId === requestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (firstLoadRef.current) {
      firstLoadRef.current = false;
      void loadSongs(query);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      void loadSongs(query);
    }, SEARCH_DEBOUNCE);

    return () => window.clearTimeout(timer);
  }, [loadSongs, query]);

  const filterFields = useMemo(() => buildFilterFields(allSongs), [allSongs]);

  const filteredSongs = useMemo(() => {
    return loadedSongs.filter((song) =>
      filterFields.every((filterField) =>
        songMatchesFilter(song, filterField, filters[filterField.field])
      )
    );
  }, [filterFields, filters, loadedSongs]);

  const recommendations = useMemo(() => {
    return allSongs
      .map((song, index) => ({
        song,
        index,
        playCount: Number(song.play_count) || 0,
      }))
      .sort(
        (first, second) =>
          second.playCount - first.playCount || first.index - second.index
      )
      .slice(0, MAX_RECOMMENDATIONS);
  }, [allSongs]);

  const setFilter = useCallback((field, value) => {
    setFilters((current) => ({ ...current, [field]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(EMPTY_FILTERS);
  }, []);

  const recordPlay = useCallback(async (song) => {
    const playCount = await recordSongPlay(song.id);

    setAllSongs((current) => {
      const next = current.map((candidate) =>
        candidate.id === song.id
          ? { ...candidate, play_count: playCount }
          : candidate
      );
      allSongsRef.current = next;
      return next;
    });

    return playCount;
  }, []);

  const filtersActive = Object.values(filters).some(Boolean);
  const isError = Boolean(error);
  const isEmpty = !isLoading && !isError && filteredSongs.length === 0;
  const statusState = isError ? 'error' : isLoading ? 'loading' : isEmpty ? 'empty' : null;
  const statusMessage = isError
    ? error
    : isLoading
      ? 'Ładowanie piosenek...'
      : isEmpty
        ? 'Nie znaleziono piosenek'
        : '';

  return {
    allSongs,
    filters,
    filtersActive,
    filterOptions: filterFields,
    filteredSongs,
    isLoading,
    isError,
    query,
    recommendations,
    setFilter,
    setQuery,
    resetFilters,
    recordPlay,
    statusMessage,
    statusState,
    songCountLabel: isError ? '' : countLabel(filteredSongs.length),
  };
}
