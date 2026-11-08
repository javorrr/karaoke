export function SearchBox({ query, onQueryChange }) {
  return (
    <label className="search-box" htmlFor="song-search">
      <svg
        className="search-icon"
        viewBox="0 0 20 20"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="8.75" cy="8.75" r="5.75" />
        <path d="m13 13 4 4" />
      </svg>
      <span className="sr-only">Szukaj piosenki lub wykonawcy</span>
      <input
        id="song-search"
        type="search"
        placeholder="Szukaj po tytule lub wykonawcy"
        autoComplete="off"
        spellCheck="false"
        aria-label="Szukaj piosenki lub wykonawcy"
        data-testid="search-input"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
      />
    </label>
  );
}
