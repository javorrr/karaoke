
export function createLyrics(display) {
  let lines = [];
  let audioDuration = null;
  let activeTime = null;

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
    if (!Number.isFinite(audioDuration) || !lines.some(line => line.time === null)) {
      return;
    }

    const interval = audioDuration / lines.length;
    lines = lines.map((line, index) => ({
      ...line,
      time: index * interval
    }));
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

  async function load(url) {
    lines = [];
    audioDuration = null;
    activeTime = null;
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

      synchronizePlainText();

      groupIntoPhrases(lines).forEach(phraseLines => {
        const phrase = document.createElement('div');
        phrase.className = 'lyrics-phrase';

        phraseLines.forEach(line => {
          const word = document.createElement('span');
          word.className = 'lyrics-line';
          word.textContent = `${line.text} `;
          phrase.appendChild(word);
        });

        display.appendChild(phrase);
      });
    } catch {
      display.textContent = 'Nie udało się pobrać tekstu.';
    }
  }

  function setDuration(duration) {
    audioDuration = duration;
    synchronizePlainText();
  }

  function update(currentTime) {
    if (!lines.length) return;

    let activeIndex = -1;

    lines.forEach((line, index) => {
      if (Number.isFinite(line.time) && currentTime >= line.time) {
        activeIndex = index;
      }
    });

    const nextActiveTime = activeIndex >= 0 ? lines[activeIndex].time : null;

    const wordElements = [...display.querySelectorAll('.lyrics-line')];

    wordElements.forEach((element, index) => {
      const active = activeIndex >= 0 && lines[index].time === nextActiveTime;

      element.classList.toggle('active', active);
    });

    if (activeIndex >= 0 && nextActiveTime !== activeTime) {
      wordElements[activeIndex].scrollIntoView({
        behavior: 'auto',
        block: 'nearest',
        inline: 'nearest'
      });
    }

    activeTime = nextActiveTime;
  }

  return { load, setDuration, update };
}
