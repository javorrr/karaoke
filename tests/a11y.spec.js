import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { gotoLibrary, openPlayer } from './helpers.js';

const WCAG_TAGS = [
  'wcag2a',
  'wcag2aa',
  'wcag21a',
  'wcag21aa',
  'wcag22a',
  'wcag22aa',
];

const analyze = async (page) => {
  const result = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return result.violations.map((violation) => ({
    id: violation.id,
    impact: violation.impact,
    help: violation.help,
    nodes: violation.nodes.map((node) => node.target.join(' ')),
  }));
};

test.describe('accessibility', () => {
  test('the library has no WCAG A/AA violations', async ({ page }) => {
    await gotoLibrary(page);

    expect(await analyze(page)).toEqual([]);
  });

  test('the player has no WCAG A/AA violations when idle', async ({
    page,
  }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    expect(await analyze(page)).toEqual([]);
  });

  test('the playing, muted, active-lyric state has no violations', async ({
    page,
  }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    await page.locator('#play-button').click();
    await page.locator('#mute-button').click();
    await page.locator('.lyrics-line').nth(2).click();

    await expect(page.locator('.pause-glyph')).toBeVisible();
    await expect(page.locator('#mute-button')).toHaveText('muted');
    await expect(page.locator('.lyrics-line').nth(2)).toHaveClass(/active/);

    expect(await analyze(page)).toEqual([]);
  });

  test('the error states have no violations', async ({ page }) => {
    await gotoLibrary(page, { audioStatus: 404, lyricsStatus: 500 });
    await openPlayer(page, { waitForAudio: false, waitForLyrics: false });

    await expect(page.locator('#player-error')).not.toHaveText('');

    expect(await analyze(page)).toEqual([]);
  });

  test('exposes the language, landmarks, headings and skip target', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const library = await page.evaluate(() => {
      const visibleHeadings = [...document.querySelectorAll('h1')]
        .filter((element) => element.offsetParent !== null)
        .map((element) => element.textContent.trim());
      const main = document.querySelector('main');

      return {
        lang: document.documentElement.lang,
        mainCount: document.querySelectorAll('main').length,
        mainId: main?.id,
        mainTabIndex: main?.tabIndex,
        headerCount: document.querySelectorAll('header').length,
        navLabel: document.querySelector('nav')?.getAttribute('aria-label'),
        visibleHeadings,
        skipHref: document.querySelector('.skip-link')?.getAttribute('href'),
        skipTarget: Boolean(document.querySelector('#main-content')),
      };
    });

    expect(library.lang).toBe('pl');
    expect(library.mainCount).toBe(1);
    expect(library.mainId).toBe('main-content');
    expect(library.mainTabIndex).toBe(-1);
    expect(library.headerCount).toBeGreaterThanOrEqual(1);
    expect(library.navLabel).toBe('Główna nawigacja');
    expect(library.visibleHeadings).toHaveLength(1);
    expect(library.skipHref).toBe('#main-content');
    expect(library.skipTarget).toBe(true);

    await openPlayer(page);

    const playerHeadings = await page.evaluate(() =>
      [...document.querySelectorAll('h1')]
        .filter((element) => element.offsetParent !== null)
        .map((element) => element.textContent.trim())
    );

    expect(playerHeadings).toHaveLength(1);
    expect(playerHeadings[0]).toBe('Last Christmas');
  });
});
