
export function createLyrics(display) {
  let lines = [];

  function parseLRC(content) {
    const parsed = [];

    content.split(/\r?\n/).forEach(line => {
      const matches = [...line.matchAll(
        /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g
      )];

      const text = line.replace(
        /\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, ''
      ).trim();

      matches.forEach(match => {
        const fraction = match[3]
          ? Number(`0.${match[3]}`)
          : 0;

        const time =
          Number(match[1]) * 60 +
          Number(match[2]) +
          fraction;

        parsed.push({ time, text });
      });
    });

    return parsed.sort((a, b) => a.time - b.time);
  }

  async function load(url) {
    lines = [];
    display.replaceChildren();

    if (!url) {
      display.textContent = 'Brak tekstu tej piosenki.';
      return;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('Brak pliku LRC');

      lines = parseLRC(await response.text());

      if (!lines.length) {
        display.textContent = 'Brak zsynchronizowanego tekstu.';
        return;
      }

      lines.forEach(line => {
        const p = document.createElement('p');
        p.className = 'lyrics-line';
        p.textContent = line.text;
        display.appendChild(p);
      });
    } catch {
      display.textContent = 'Nie udało się pobrać tekstu.';
    }
  }

  function update(currentTime) {
    if (!lines.length) return;

    let activeIndex = -1;

    lines.forEach((line, index) => {
      if (currentTime >= line.time) activeIndex = index;
    });

    [...display.children].forEach((element, index) => {
      const active = index === activeIndex;
      const wasActive = element.classList.contains('active');

      element.classList.toggle('active', active);

      if (active && !wasActive) {
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center'
        });
      }
    });
  }

  return { load, update };
}
