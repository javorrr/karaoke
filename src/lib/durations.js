const CACHE_PREFIX = 'karaoke:duration:';
const MAX_CONCURRENT = 4;
const TIMEOUT = 8000;

const memory = new Map();
const pending = new Map();
const listeners = new Set();
const queue = [];
let active = 0;

const readStored = (url) => {
  try {
    const raw = window.sessionStorage.getItem(`${CACHE_PREFIX}${url}`);
    if (raw === null) return null;
    const value = Number(raw);
    return Number.isFinite(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
};

const writeStored = (url, seconds) => {
  try {
    window.sessionStorage.setItem(`${CACHE_PREFIX}${url}`, String(seconds));
  } catch {
    // Storage can be blocked in private modes; the module Map still caches.
  }
};

const notify = (url, seconds) => {
  memory.set(url, seconds);
  for (const listener of listeners) listener(url, seconds);
};

const startNext = () => {
  if (active >= MAX_CONCURRENT) return;

  const job = queue.shift();
  if (!job) return;

  active += 1;

  measure(job.url)
    .then((seconds) => {
      if (seconds !== null) writeStored(job.url, seconds);
      pending.delete(job.url);
      notify(job.url, seconds);
      job.resolve(seconds);
    })
    .catch(() => {
      pending.delete(job.url);
      notify(job.url, null);
      job.resolve(null);
    })
    .finally(() => {
      active -= 1;
      startNext();
    });
};

function measure(url) {
  return new Promise((resolve) => {
    if (typeof Audio === 'undefined') {
      resolve(null);
      return;
    }

    const audio = new Audio();
    let settled = false;

    const finish = (seconds) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);

      audio.removeEventListener('loadedmetadata', handleLoaded);
      audio.removeEventListener('error', handleError);

      try {
        audio.removeAttribute('src');
        audio.load();
      } catch {
        // Releasing the decoder is best-effort.
      }

      resolve(seconds);
    };

    const handleLoaded = () => {
      const seconds = Number(audio.duration);
      finish(Number.isFinite(seconds) && seconds > 0 ? seconds : null);
    };

    const handleError = () => finish(null);
    const timer = window.setTimeout(() => finish(null), TIMEOUT);

    audio.preload = 'metadata';
    audio.addEventListener('loadedmetadata', handleLoaded, { once: true });
    audio.addEventListener('error', handleError, { once: true });
    audio.src = url;
    audio.load();
  });
}

export function getCachedDuration(url) {
  if (!url) return null;
  if (memory.has(url)) return memory.get(url);

  const stored = readStored(url);
  if (stored !== null) {
    memory.set(url, stored);
    return stored;
  }

  return null;
}

export function requestDuration(url) {
  if (!url) return Promise.resolve(null);

  const cached = getCachedDuration(url);
  if (cached !== null) return Promise.resolve(cached);
  if (pending.has(url)) return pending.get(url);

  const promise = new Promise((resolve) => {
    queue.push({ url, resolve });
    startNext();
  });

  pending.set(url, promise);
  return promise;
}

export function subscribeDurations(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
