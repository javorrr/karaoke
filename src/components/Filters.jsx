const FILTER_ARIA = {
  genre: 'Filtruj według gatunku',
  language: 'Filtruj według języka',
  decade: 'Filtruj według dekady',
};

const filterAria = (field, label) =>
  FILTER_ARIA[field] || `Filtruj według: ${label}`;

export function Filters({
  filters,
  filterOptions,
  filtersActive,
  onFilterChange,
  onReset,
}) {
  return (
    <section
      className="filters-panel"
      aria-labelledby="filters-title"
      data-testid="filters"
    >
      <div className="filters-heading">
        <h2 id="filters-title" className="filters-title">
          Dopasuj repertuar
        </h2>
      </div>
      <div className="filters-grid">
        {filterOptions.map(({ field, label, emptyLabel, options }) => (
          <label className="filter-field" htmlFor={`${field}-filter`} key={field}>
            <span>{label}</span>
            <select
              id={`${field}-filter`}
              aria-label={filterAria(field, label)}
              value={filters[field] ?? ''}
              data-filter-field={field}
              data-lenis-prevent
              onChange={(event) => onFilterChange(field, event.target.value)}
            >
              <option value="">{emptyLabel}</option>
              {options.map((value) => (
                <option value={value} key={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        ))}
        <button
          id="reset-filters"
          className="reset-filters"
          type="button"
          disabled={!filtersActive}
          aria-disabled={String(!filtersActive)}
          onClick={onReset}
        >
          Wyczyść filtry
        </button>
      </div>
    </section>
  );
}
