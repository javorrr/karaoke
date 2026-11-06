import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixturesDir = path.join(here, 'fixtures');

export const projectRoot = path.resolve(here, '..');
export const stylesDir = path.join(projectRoot, 'styles');

export const songsFixture = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'songs.json'), 'utf8')
);
export const lyricsFixture = fs.readFileSync(
  path.join(fixturesDir, 'lyrics.lrc'),
  'utf8'
);
export const audioFixture = fs.readFileSync(
  path.join(fixturesDir, 'silence.wav')
);
export const domContract = JSON.parse(
  fs.readFileSync(path.join(fixturesDir, 'dom-contract.json'), 'utf8')
);

async function serveAudio(route, audio, status = 200) {
  if (status !== 200) {
    await route.fulfill({
      status,
      headers: { 'Content-Type': 'audio/wav' },
      body: '',
    });
    return;
  }

  const total = audio.length;
  const range = route.request().headers()['range'];
  const headers = {
    'Content-Type': 'audio/wav',
    'Accept-Ranges': 'bytes',
  };

  if (!range) {
    await route.fulfill({
      status: 200,
      headers: { ...headers, 'Content-Length': String(total) },
      body: audio,
    });
    return;
  }

  const match = /bytes=(\d*)-(\d*)/.exec(range);
  const start = match?.[1] ? Number(match[1]) : 0;
  const end = Math.min(
    match?.[2] ? Number(match[2]) : total - 1,
    total - 1
  );

  if (start >= total || start > end) {
    await route.fulfill({
      status: 416,
      headers: { ...headers, 'Content-Range': `bytes */${total}` },
      body: '',
    });
    return;
  }

  const chunk = audio.subarray(start, end + 1);
  await route.fulfill({
    status: 206,
    headers: {
      ...headers,
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Content-Length': String(chunk.length),
    },
    body: chunk,
  });
}

/**
 * Deterministic API layer for every UI test. The songs endpoint also applies
 * the `q` parameter so the real debounced search flow is exercised.
 */
export async function installApiMocks(page, options = {}) {
  const {
    songs = songsFixture,
    songsStatus = 200,
    songsError = 'Nie udało się pobrać piosenek.',
    lyrics = lyricsFixture,
    lyricsStatus = 200,
    playCount = 8,
    audio = audioFixture,
    audioStatus = 200,
  } = options;

  await page.route('**/api/songs.php*', async (route) => {
    if (songsStatus !== 200) {
      await route.fulfill({
        status: songsStatus,
        contentType: 'application/json',
        body: JSON.stringify({ error: songsError }),
      });
      return;
    }

    const url = new URL(route.request().url());
    const query = (url.searchParams.get('q') || '').trim().toLocaleLowerCase('pl');
    const filtered = query
      ? songs.filter((song) =>
          `${song.title} ${song.artist}`
            .toLocaleLowerCase('pl')
            .includes(query)
        )
      : songs;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(filtered),
    });
  });

  await page.route('**/api/song-play.php', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ play_count: playCount }),
    });
  });

  await page.route('**/api/lyrics.php*', async (route) => {
    if (lyricsStatus !== 200) {
      await route.fulfill({
        status: lyricsStatus,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Brak tekstu' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ lyrics }),
    });
  });

  await page.route('**/api/audio.php*', (route) =>
    serveAudio(route, audio, audioStatus)
  );
}

export async function gotoLibrary(page, options = {}) {
  await installApiMocks(page, options);
  await page.goto('/', { waitUntil: 'domcontentloaded' });

  if (options.waitForRows !== false) {
    await expect(page.locator('#songs-list .song-row')).toHaveCount(
      options.expectedRowCount ?? options.songs?.length ?? songsFixture.length
    );
  }

  await page.evaluate(() => document.fonts.ready);
}

async function waitForPlayer(page, options) {
  const {
    waitForAudio = true,
    waitForLyrics = true,
    lyricsCount = 4,
  } = options;

  await expect(page.locator('#player-view')).toBeVisible();
  await expect(page.locator('#library-view')).toBeHidden();
  await expect(page.locator('#player-title')).not.toHaveText('-');

  if (waitForAudio) {
    await expect(page.locator('#progress-slider')).toBeEnabled();
  }

  if (waitForLyrics) {
    await expect(page.locator('.lyrics-line')).toHaveCount(lyricsCount);
  }
}

export async function openPlayer(page, options = {}) {
  const index = options.index ?? 0;
  await page.locator('#songs-list .sing-button').nth(index).click();
  await waitForPlayer(page, options);
}

export async function openPlayerFromRecommendation(page, options = {}) {
  const index = options.index ?? 0;
  await page.locator('.recommended-song').nth(index).click();
  await waitForPlayer(page, options);
}

export async function playerSnapshot(page) {
  return page.evaluate(() => {
    const active = document.querySelector('.lyrics-line.active');
    const current = document.querySelector('#current-time');
    const duration = document.querySelector('#duration');
    const slider = document.querySelector('#progress-slider');
    const play = document.querySelector('#play-button');
    const mute = document.querySelector('#mute-button');

    return {
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
      current: current?.textContent,
      duration: duration?.textContent,
      sliderValue: slider?.value,
      sliderMax: slider?.max,
      sliderProgress: slider?.style.getPropertyValue('--progress'),
      sliderDisabled: slider?.disabled,
      activeText: active?.textContent.trim() ?? null,
      activeAriaCurrent: active?.getAttribute('aria-current') ?? null,
      playText: play?.textContent.trim(),
      playLabel: play?.getAttribute('aria-label'),
      muteText: mute?.textContent.trim(),
      mutePressed: mute?.getAttribute('aria-pressed'),
      muteLabel: mute?.getAttribute('aria-label'),
      pauseGlyph: Boolean(document.querySelector('.pause-glyph')),
    };
  });
}

export function listStyleFiles() {
  const files = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) walk(fullPath);
      else if (entry.name.endsWith('.css')) files.push(fullPath);
    }
  };
  walk(stylesDir);
  return files;
}
