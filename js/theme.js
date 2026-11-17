const THEME_STORAGE_KEY = 'karaoke-theme';

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme === 'light' ? 'light' : 'dark';
}

applyTheme(localStorage.getItem(THEME_STORAGE_KEY));

export function setupThemeToggle(button) {
  if (!button) {
    return;
  }

  const updateButton = () => {
    const isLight = document.documentElement.dataset.theme === 'light';
    button.setAttribute('aria-pressed', String(isLight));
    button.setAttribute('aria-label', isLight ? 'Włącz ciemny motyw' : 'Włącz jasny motyw');
    button.querySelector('.theme-toggle-icon').textContent = isLight ? '☾' : '☀';
    button.querySelector('.theme-toggle-label').textContent = isLight ? 'Ciemny motyw' : 'Jasny motyw';
  };

  updateButton();
  button.addEventListener('click', () => {
    const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(nextTheme);
    localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    updateButton();
  });
}
