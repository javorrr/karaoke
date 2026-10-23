export function setupSearch(input, onSearch) {
  let timer;

  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => onSearch(input.value.trim()), 300);
  });
}