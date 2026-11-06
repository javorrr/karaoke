import { test, expect } from '@playwright/test';
import { domContract, gotoLibrary, openPlayer } from './helpers.js';

const collect = (page, selector) =>
  page.evaluate((rootSelector) => {
    const root = document.querySelector(rootSelector);
    const scope = root ? [root, ...root.querySelectorAll('*')] : [];
    const classes = new Set();
    const ids = new Set();
    const aria = new Set();
    const data = new Set();

    for (const element of scope) {
      for (const className of element.classList) classes.add(className);
      if (element.id) ids.add(element.id);
      for (const attribute of element.attributes) {
        if (attribute.name.startsWith('aria-')) aria.add(attribute.name);
        if (attribute.name.startsWith('data-')) data.add(attribute.name);
      }
    }

    return {
      classes: [...classes].sort(),
      ids: [...ids].sort(),
      aria: [...aria].sort(),
      data: [...data].sort(),
    };
  }, selector);

const missingFrom = (expected, actual) =>
  expected.filter((value) => !actual.includes(value));

test.describe('DOM contract', () => {
  test('the library keeps every documented class, id, aria and data hook', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const library = await collect(page, '#library-view');
    const header = await collect(page, '.site-header');

    expect(missingFrom(domContract.libraryClasses, library.classes)).toEqual([]);
    expect(missingFrom(domContract.headerClasses, header.classes)).toEqual([]);

    expect(library.classes.length).toBeGreaterThanOrEqual(
      domContract.libraryClasses.length
    );
    expect(library.aria).toEqual(expect.arrayContaining(['aria-live']));
    expect(library.data).toEqual(expect.arrayContaining(['data-testid']));
  });

  test('the player keeps every documented class, id, aria and data hook', async ({
    page,
  }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    const player = await collect(page, '#player-view');

    expect(missingFrom(domContract.playerClasses, player.classes)).toEqual([]);

    for (const id of domContract.ids) {
      await expect(page.locator(`#${id}`)).toHaveCount(1);
    }

    for (const attribute of domContract.ariaAttributes) {
      await expect
        .poll(() =>
          page.evaluate(
            (name) => document.querySelector(`[${name}]`) !== null,
            attribute
          )
        )
        .toBe(true);
    }

    for (const attribute of domContract.dataAttributes) {
      await expect
        .poll(() =>
          page.evaluate(
            (name) => document.querySelector(`[${name}]`) !== null,
            attribute
          )
        )
        .toBe(true);
    }
  });

  test('the playing state adds the pause glyph without removing the play glyph contract', async ({
    page,
  }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    await page.locator('#play-button').click();
    await expect(page.locator('.pause-glyph')).toBeVisible();

    const playing = await collect(page, '#player-view');
    expect(playing.classes).toEqual(
      expect.arrayContaining(domContract.playerPlayingClasses)
    );
    expect(playing.classes).toEqual(expect.arrayContaining(['play-button']));
  });

  test('the documented test ids remain stable for the suite', async ({
    page,
  }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    const testIds = await page.evaluate(() =>
      [...document.querySelectorAll('[data-testid]')]
        .map((element) => element.dataset.testid)
        .sort()
    );

    expect(testIds).toEqual(
      expect.arrayContaining([
        'back-button',
        'brand',
        'filters',
        'library-view',
        'list-status',
        'lyrics-display',
        'play-button',
        'player-panel',
        'player-view',
        'progress-slider',
        'recommendations',
        'search-input',
        'site-header',
        'song-count',
        'songs-list',
        'volume-slider',
      ])
    );
  });
});
