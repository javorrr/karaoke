const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

export function createLyrics(display, { onSeek } = {}) {
  let lines = [];
  let lineElements = [];
  let audioDuration = null;
  let activeTime = null;
  let follow = true;
  let loadId = 0;

  function parseLRC(content) {
    const parsed = [];
    const plainText = [];

    content.split(/\r?\n/).forEach(line => {
      const matches = [...line.matchAll(
        /\[(\d{2}):(\d{2})(?:\.(\d{1,3}))?\]/g
      )];

      const text = line.replace(
        /\[\d{2}:\d{2}(?:\.\d{1,3})?\]/g, ''
      ).trim();

      if (!matches.length && text) {
        plainText.push(text);
      }

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

    if (parsed.length) {
      return parsed.sort((a, b) => a.time - b.time);
    }

    return plainText.map(text => ({ time: null, text }));
  }

  function synchronizePlainText() {
    if (!Number.isFinite(audioDuration) || audioDuration <= 0) {
      return;
    }

    if (!lines.length || !lines.every(line => line.time === null)) {
      return;
    }

    const interval = audioDuration / lines.length;
    lines = lines.map((line, index) => ({
      ...line,
      time: index * interval
    }));

    lineElements.forEach((element, index) => {
      element.dataset.time = String(lines[index].time);
      element.tabIndex = 0;
      element.setAttribute('role', 'button');
      element.setAttribute('aria-label', `Przewiń do: ${lines[index].text}`);
    });
  }

  function groupIntoPhrases(entries) {
    const phrases = [];
    let phrase = [];

    entries.forEach((entry, index) => {
      phrase.push(entry);

      const nextEntry = entries[index + 1];
      const endsWithPunctuation = /[,.!?…]$/.test(entry.text);
      const hasPause = nextEntry && nextEntry.time - entry.time >= 1.5;

      if (!nextEntry || endsWithPunctuation || hasPause) {
        phrases.push(phrase);
        phrase = [];
      }
    });

    return phrases;
  }

  function scrollToLine(element) {
    if (!element) return;

    const displayRect = display.getBoundingClientRect();
    const lineRect = element.getBoundingClientRect();
    const target = display.scrollTop
      + (lineRect.top - displayRect.top)
      - (display.clientHeight - lineRect.height) / 2;

    display.scrollTo({
      top: Math.max(0, target),
      behavior: reduceMotionQuery.matches ? 'auto' : 'smooth'
    });
  }

  function render() {
    display.replaceChildren();
    lineElements = [];

    groupIntoPhrases(lines).forEach((phraseLines, phraseIndex) => {
      const phrase = document.createElement('div');
      phrase.className = 'lyrics-phrase';
      phrase.style.setProperty(
        '--phrase-index',
        String(Math.min(phraseIndex, 12))
      );

      phraseLines.forEach(line => {
        const word = document.createElement('span');
        const index = lineElements.length;
        word.className = 'lyrics-line';
        word.textContent = `${line.text} `;

        if (Number.isFinite(line.time)) {
          word.dataset.time = String(line.time);
          word.tabIndex = 0;
          word.setAttribute('role', 'button');
          word.setAttribute('aria-label', `Przewiń do: ${line.text}`);
        }

        const seek = () => {
          const time = lines[index]?.time;
          if (Number.isFinite(time)) {
            onSeek?.(time);
          }
        };

        word.addEventListener('click', seek);
        word.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            seek();
          }
        });

        lineElements.push(word);
        phrase.appendChild(word);
      });

      display.appendChild(phrase);
    });
  }

  async function load(url, song) {
    loadId += 1;
    const currentLoadId = loadId;

    lines = [];
    lineElements = [];
    audioDuration = null;
    activeTime = null;
    display.replaceChildren();

    try {
      let content = '';

      if (url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error('Brak pliku LRC');
        content = await response.text();
      } else if (song?.title) {
        const params = new URLSearchParams({
          title: song.title,
          artist: song.artist || ''
        });
        const response = await fetch(`api/lyrics.php?${params}`);
        if (!response.ok) throw new Error('Brak tekstu LRCLIB');
        const data = await response.json();
        content = data.lyrics || '';
      } else {
        throw new Error('Brak danych piosenki');
      }

      if (currentLoadId !== loadId) return;

      lines = parseLRC(content);

      if (!lines.length) {
        display.textContent = 'Brak zsynchronizowanego tekstu.';
        return;
      }

      synchronizePlainText();
      render();
    } catch {
      if (currentLoadId !== loadId) return;
      display.textContent = 'Nie udało się pobrać tekstu.';
    }
  }

  function setDuration(duration) {
    if (!Number.isFinite(duration) || duration <= 0) return;

    audioDuration = duration;
    synchronizePlainText();
  }

  function update(currentTime) {
    if (!lines.length || !lineElements.length) return;

    let activeIndex = -1;

    lines.forEach((line, index) => {
      if (Number.isFinite(line.time) && currentTime >= line.time) {
        activeIndex = index;
      }
    });

    const nextActiveTime = activeIndex >= 0 ? lines[activeIndex].time : null;

    lineElements.forEach((element, index) => {
      const active = activeIndex >= 0 && lines[index].time === nextActiveTime;
      element.classList.toggle('active', active);

      if (active) {
        element.setAttribute('aria-current', 'true');
      } else {
        element.removeAttribute('aria-current');
      }
    });

    if (activeIndex >= 0 && nextActiveTime !== activeTime && follow) {
      let scrollIndex = activeIndex;

      while (scrollIndex > 0 && lines[scrollIndex - 1].time === nextActiveTime) {
        scrollIndex -= 1;
      }

      scrollToLine(lineElements[scrollIndex]);
    }

    activeTime = nextActiveTime;
  }

  function setFollow(value) {
    follow = Boolean(value);

    if (!follow || activeTime === null) return;

    const index = lines.findIndex(line => line.time === activeTime);
    if (index >= 0) {
      scrollToLine(lineElements[index]);
    }
  }

  return { load, setDuration, update, setFollow };
}
