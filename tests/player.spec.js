import { test, expect } from '@playwright/test';
import { gotoLibrary, openPlayer } from './helpers.js';

const setRange = (page, selector, value) =>
  page.locator(selector).evaluate((element, nextValue) => {
    element.value = String(nextValue);
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);

test.describe('player', () => {
  test('loads the song, duration and synced lyrics', async ({ page }) => {
    await openPlayer(page);

    await expect(page.locator('#player-title')).toHaveText('Last Christmas');
    await expect(page.locator('#player-artist')).toHaveText('Wham!');
    await expect(page.locator('.lyrics-line')).toHaveCount(4);
    await expect(page.locator('#duration')).toHaveText('00:12');
    await expect(page.locator('#progress-slider')).toHaveAttribute('max', '12');
    await expect(page.locator('.lyrics-line').first()).toHaveClass(/active/);
    await expect(page.locator('.lyrics-line').first()).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  test('toggles play and pause through the glyph, label and clock', async ({
    page,
  }) => {
    await openPlayer(page);

    await page.locator('#play-button').click();

    await expect(page.locator('.pause-glyph')).toBeVisible();
    await expect(page.locator('#play-button')).toContainText('Pause');
    await expect(page.locator('#play-button')).toHaveAttribute(
      'aria-label',
      'Pause — wstrzymaj piosenkę'
    );
    await expect
      .poll(async () =>
        Number(await page.locator('#progress-slider').inputValue())
      )
      .toBeGreaterThan(0.2);

    await page.locator('#play-button').click();

    await expect(page.locator('.play-glyph')).toBeVisible();
    await expect(page.locator('#play-button')).toContainText('Play');
    await expect(page.locator('#play-button')).toHaveAttribute(
      'aria-label',
      'Play — odtwórz piosenkę'
    );
  });

  test('seeks ten seconds in both directions and clamps at the start', async ({
    page,
  }) => {
    await openPlayer(page);

    await page.locator('#seek-forward').click();
    await expect(page.locator('#progress-slider')).toHaveValue('10');
    await expect(page.locator('#current-time')).toHaveText('00:10');

    await page.locator('#seek-back').click();
    await expect(page.locator('#progress-slider')).toHaveValue('0');
    await expect(page.locator('#current-time')).toHaveText('00:00');

    await page.locator('#seek-back').click();
    await expect(page.locator('#progress-slider')).toHaveValue('0');
    await expect(page.locator('#current-time')).toHaveText('00:00');
  });

  test('moves the timeline, progress paint and active lyric together', async ({
    page,
  }) => {
    await openPlayer(page);

    await setRange(page, '#progress-slider', 5.4);

    await expect(page.locator('#current-time')).toHaveText('00:05');
    await expect(page.locator('#progress-slider')).toHaveValue('5.4');
    await expect(page.locator('.lyrics-line').nth(2)).toHaveClass(/active/);
    await expect(page.locator('.lyrics-line').nth(2)).toHaveAttribute(
      'aria-current',
      'true'
    );
    await expect(page.locator('.lyrics-line').first()).not.toHaveClass(/active/);

    const progress = await page
      .locator('#progress-slider')
      .evaluate((element) => element.style.getPropertyValue('--progress'));

    expect(Number.parseFloat(progress)).toBeCloseTo(45, 0);
  });

  test('treats every timed lyric as a seek control', async ({ page }) => {
    await openPlayer(page);

    await page.locator('.lyrics-line').nth(2).click();

    await expect(page.locator('#current-time')).toHaveText('00:05');
    await expect(page.locator('#progress-slider')).toHaveValue('5.4');
    await expect(page.locator('.lyrics-line').nth(2)).toHaveClass(/active/);
    await expect(page.locator('.lyrics-line').nth(2)).toHaveAttribute(
      'aria-current',
      'true'
    );
  });

  test('mutes, unmutes and recovers from a zero volume', async ({ page }) => {
    await openPlayer(page);

    const mute = page.locator('#mute-button');

    await expect(mute).toHaveText('sound');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await expect(mute).toHaveAttribute('aria-label', 'sound — wycisz dźwięk');

    await mute.click();
    await expect(mute).toHaveText('muted');
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    await expect(mute).toHaveAttribute('aria-label', 'muted — włącz dźwięk');

    await mute.click();
    await expect(mute).toHaveText('sound');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');

    await setRange(page, '#volume-slider', 0);
    await expect(mute).toHaveText('muted');
    await expect(mute).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('#volume-slider')).toHaveValue('0');
    await expect
      .poll(() =>
        page
          .locator('#volume-slider')
          .evaluate((element) => element.style.getPropertyValue('--volume'))
      )
      .toBe('0%');

    await mute.click();
    await expect(mute).toHaveText('sound');
    await expect(mute).toHaveAttribute('aria-pressed', 'false');
    await expect(page.locator('#volume-slider')).toHaveValue('1');
  });

  test('persists volume, speed and follow preferences across reloads', async ({
    page,
  }) => {
    await openPlayer(page);

    await setRange(page, '#volume-slider', 0.35);
    await page.locator('#speed-select').selectOption('1.25');
    await page.locator('#lyrics-follow').uncheck();

    await expect
      .poll(() =>
        page.evaluate(() => ({
          volume: localStorage.getItem('karaoke:volume'),
          speed: localStorage.getItem('karaoke:speed'),
          follow: localStorage.getItem('karaoke:follow-lyrics'),
        }))
      )
      .toEqual({ volume: '0.35', speed: '1.25', follow: 'false' });

    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.locator('#songs-list .song-row')).toHaveCount(3);
    await openPlayer(page);

    await expect(page.locator('#volume-slider')).toHaveValue('0.35');
    await expect(page.locator('#speed-select')).toHaveValue('1.25');
    await expect(page.locator('#lyrics-follow')).not.toBeChecked();
  });

  test('applies the stage theme while the player is open', async ({ page }) => {
    await gotoLibrary(page);

    const library = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
    }));
    expect(library.background).toBe('rgb(244, 241, 232)');
    expect(library.color).toBe('rgb(20, 23, 46)');

    await openPlayer(page);

    const stage = await page.evaluate(() => ({
      background: getComputedStyle(document.body).backgroundColor,
      color: getComputedStyle(document.body).color,
      scheme: getComputedStyle(document.body).colorScheme,
    }));
    expect(stage.background).toBe('rgb(11, 16, 38)');
    expect(stage.color).toBe('rgb(255, 248, 238)');
    expect(stage.scheme).toBe('dark');
  });

  test('surfaces an audio failure and disables the timeline', async ({
    page,
  }) => {
    await gotoLibrary(page, { audioStatus: 404 });
    await openPlayer(page, { waitForAudio: false });

    await expect(page.locator('#player-error')).toHaveText(
      'Nie można odtworzyć tego pliku audio. Dodaj plik do folderu songs/audio.'
    );
    await expect(page.locator('#progress-slider')).toBeDisabled();
  });

  test('shows a fallback when lyrics cannot be fetched', async ({ page }) => {
    await gotoLibrary(page, { lyricsStatus: 500 });
    await openPlayer(page, { waitForLyrics: false });

    await expect(page.locator('#lyrics-display')).toHaveText(
      'Nie udało się pobrać tekstu.'
    );
  });

  test('shows a fallback when the lyrics response is empty', async ({
    page,
  }) => {
    await gotoLibrary(page, { lyrics: '' });
    await openPlayer(page, { waitForLyrics: false });

    await expect(page.locator('#lyrics-display')).toHaveText(
      'Brak zsynchronizowanego tekstu.'
    );
  });

  test('stops playback on back and starts the next visit paused', async ({
    page,
  }) => {
    await openPlayer(page);
    await page.locator('#play-button').click();
    await expect(page.locator('.pause-glyph')).toBeVisible();

    await page.locator('#back-button').click();
    await expect(page.locator('#library-view')).toBeVisible();
    await expect(page.locator('#player-view')).toBeHidden();

    await openPlayer(page);
    await expect(page.locator('#play-button')).toContainText('Play');
    await expect(page.locator('.play-glyph')).toBeVisible();
  });
});
