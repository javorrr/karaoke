import { Hero } from './Hero.jsx';
import { SearchBox } from './SearchBox.jsx';
import { Filters } from './Filters.jsx';
import { Recommendations } from './Recommendations.jsx';
import { SongList } from './SongList.jsx';

export function LibraryView({ hidden, library, onSelect }) {
  return (
    <section
      id="library-view"
      className="library-view"
      hidden={hidden}
      aria-labelledby="library-title"
      data-testid="library-view"
    >
      <Hero />
      <SearchBox query={library.query} onQueryChange={library.setQuery} />
      <Filters
        filters={library.filters}
        filterOptions={library.filterOptions}
        filtersActive={library.filtersActive}
        onFilterChange={library.setFilter}
        onReset={library.resetFilters}
      />
      <Recommendations songs={library.recommendations} onSelect={onSelect} />

      <div className="list-heading">
        <h2>Wszystkie piosenki</h2>
        <span
          id="song-count"
          className="song-count"
          aria-live="polite"
          data-testid="song-count"
        >
          {library.songCountLabel}
        </span>
      </div>

      <SongList
        songs={library.filteredSongs}
        isLoading={library.isLoading}
        onSelect={onSelect}
      />

      <p
        id="list-status"
        className="status-message"
        role="status"
        data-testid="list-status"
        data-state={library.statusState ?? undefined}
      >
        {library.statusMessage}
      </p>
    </section>
  );
}
