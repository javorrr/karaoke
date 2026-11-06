import { test, expect } from '@playwright/test';
import {
  gotoLibrary,
  openPlayer,
  openPlayerFromRecommendation,
  songsFixture,
} from './helpers.js';

test.describe('library', () => {
  test('renders the complete setlist and a live count', async ({ page }) => {
    await gotoLibrary(page);

    await expect(page.locator('#songs-list .song-row')).toHaveCount(
      songsFixture.length
    );
    await expect(page.locator('.song-title')).toHaveText(
      songsFixture.map((song) => song.title)
    );
    await expect(page.locator('.song-artist')).toHaveText(
      songsFixture.map((song) => song.artist)
    );
    await expect(page.locator('#song-count')).toHaveText(
      `${songsFixture.length} piosenek`
    );
    await expect(page.locator('#list-status')).toHaveText('');
  });

  test('searches after the debounce and restores the full list', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const popularBefore = await page
      .locator('.popular-details strong')
      .allTextContents();

    await page.locator('#song-search').fill('temperatura');

    await expect(page.locator('#songs-list .song-row')).toHaveCount(1);
    await expect(page.locator('.song-title')).toHaveText('Temperatura');
    await expect(page.locator('#song-count')).toHaveText('1 piosenka');
    await expect(page.locator('.popular-details strong')).toHaveText(
      popularBefore
    );

    await page.locator('#song-search').fill('');

    await expect(page.locator('#songs-list .song-row')).toHaveCount(
      songsFixture.length
    );
    await expect(page.locator('#song-count')).toHaveText(
      `${songsFixture.length} piosenek`
    );
  });

  test('announces an empty search result', async ({ page }) => {
    await gotoLibrary(page);

    await page.locator('#song-search').fill('nie-ma-takiej-piosenki');

    await expect(page.locator('#songs-list .song-row')).toHaveCount(0);
    await expect(page.locator('#list-status')).toHaveText(
      'Nie znaleziono piosenek'
    );
    await expect(page.locator('#song-count')).toHaveText('0 piosenek');
  });

  test('combines filters and resets them', async ({ page }) => {
    await gotoLibrary(page);

    await page.locator('#genre-filter').selectOption('Pop');
    await expect(page.locator('#songs-list .song-row')).toHaveCount(2);
    await expect(page.locator('#reset-filters')).toBeEnabled();
    await expect(page.locator('#reset-filters')).toHaveAttribute(
      'aria-disabled',
      'false'
    );

    await page.locator('#language-filter').selectOption('Polski');
    await expect(page.locator('#songs-list .song-row')).toHaveCount(1);
    await expect(page.locator('.song-title')).toHaveText(
      'W sumie nie jest źle'
    );

    await page.locator('#reset-filters').click();

    await expect(page.locator('#songs-list .song-row')).toHaveCount(
      songsFixture.length
    );
    await expect(page.locator('#genre-filter')).toHaveValue('');
    await expect(page.locator('#language-filter')).toHaveValue('');
    await expect(page.locator('#reset-filters')).toBeDisabled();
    await expect(page.locator('#reset-filters')).toHaveAttribute(
      'aria-disabled',
      'true'
    );
  });

  test('renders recommendations and the popular chart in play-count order', async ({
    page,
  }) => {
    await gotoLibrary(page);

    await expect(page.locator('#recommendations')).toBeVisible();
    await expect(page.locator('.recommended-song')).toHaveCount(3);
    await expect(page.locator('.popular-song')).toHaveCount(3);

    const sorted = [...songsFixture].sort(
      (first, second) => second.play_count - first.play_count
    );

    await expect(page.locator('.recommended-song .recommendation-song-title'))
      .toHaveText(sorted.map((song) => song.title));

    await expect(page.locator('.popular-rank')).toHaveText(['1', '2', '3']);
    await expect(page.locator('.popular-plays')).toHaveText(
      sorted.map((song) =>
        `${song.play_count} ${song.play_count === 1 ? 'śpiewanie' : 'śpiewań'}`
      )
    );
    await expect(page.locator('#recommended-title')).toHaveText(
      'Polecane piosenki'
    );
    await expect(page.locator('#popular-title')).toHaveText(
      'Najchętniej śpiewane'
    );
  });

  test('gives the popular chart the same hover treatment as the setlist', async ({
    page,
    hasTouch,
  }) => {
    test.skip(hasTouch, 'hover states require a hover-capable pointer');

    await gotoLibrary(page);

    const row = page.locator('.popular-song').first();
    await row.hover();

    await expect
      .poll(() =>
        row.evaluate(
          (element) => getComputedStyle(element, '::before').opacity
        )
      )
      .toBe('1');

    const hover = await row.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
      titleTransform: getComputedStyle(
        element.querySelector('.popular-details strong')
      ).transform,
      buttonBackground: getComputedStyle(
        element.querySelector('.popular-sing-button')
      ).backgroundColor,
    }));

    expect(hover.background).not.toBe('rgba(0, 0, 0, 0)');
    expect(hover.titleTransform).not.toBe('none');
    expect(hover.buttonBackground).toBe('rgb(27, 42, 107)');
  });

  test('opens the player from a setlist row and returns', async ({ page }) => {
    await gotoLibrary(page);

    await page.locator('#songs-list .sing-button').first().click();

    await expect(page.locator('#player-view')).toBeVisible();
    await expect(page.locator('#library-view')).toBeHidden();
    await expect(page.locator('#player-title')).toHaveText('Last Christmas');
    await expect(page.locator('#player-artist')).toHaveText('Wham!');

    await page.locator('#back-button').click();

    await expect(page.locator('#library-view')).toBeVisible();
    await expect(page.locator('#player-view')).toBeHidden();
  });

  test('opens the player from a recommendation', async ({ page }) => {
    await gotoLibrary(page);

    await openPlayerFromRecommendation(page, { index: 1 });

    await expect(page.locator('#player-title')).toHaveText('Temperatura');
    await expect(page.locator('#player-artist')).toHaveText('SKOLIM');
  });

  test('records a play and refreshes the popular chart', async ({ page }) => {
    await gotoLibrary(page);

    await openPlayer(page);
    await page.locator('#back-button').click();

    await expect(page.locator('.popular-song').first()).toContainText(
      'Last Christmas'
    );
    await expect(page.locator('.popular-plays').first()).toHaveText(
      '8 śpiewań'
    );
  });

  test('shows an API error without stale rows', async ({ page }) => {
    await gotoLibrary(page, { songsStatus: 500, waitForRows: false });

    await expect(page.locator('#list-status')).toHaveText(
      'Nie udało się pobrać piosenek.'
    );
    await expect(page.locator('#songs-list .song-row')).toHaveCount(0);
    await expect(page.locator('#song-count')).toHaveText('');
    await expect(page.locator('#recommendations')).toBeHidden();
  });
});
