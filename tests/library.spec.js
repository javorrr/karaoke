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

    const recommendedBefore = await page
      .locator('.recommendation-song-title')
      .allTextContents();

    await page.locator('#song-search').fill('temperatura');

    await expect(page.locator('#songs-list .song-row')).toHaveCount(1);
    await expect(page.locator('.song-title')).toHaveText('Temperatura');
    await expect(page.locator('#song-count')).toHaveText('1 piosenka');
    await expect(page.locator('.recommendation-song-title')).toHaveText(
      recommendedBefore
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

  test('renders the Na dziś list in play-count order', async ({ page }) => {
    await gotoLibrary(page);

    await expect(page.locator('#recommendations')).toBeVisible();
    await expect(page.locator('.recommended-song')).toHaveCount(3);

    const sorted = [...songsFixture].sort(
      (first, second) => second.play_count - first.play_count
    );

    await expect(page.locator('.recommended-song .recommendation-song-title'))
      .toHaveText(sorted.map((song) => song.title));
    await expect(page.locator('.recommended-song .recommendation-song-artist'))
      .toHaveText(sorted.map((song) => song.artist));
    await expect(page.locator('.recommendation-plays')).toHaveText(
      sorted.map((song) =>
        `${song.play_count} ${song.play_count === 1 ? 'śpiewanie' : 'śpiewań'}`
      )
    );
    await expect(page.locator('#recommended-title')).toHaveText('Na dziś');
  });

  test('highlights the hovered setlist row', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'hover states require a hover-capable pointer');

    await gotoLibrary(page);

    const row = page.locator('.song-row').first();
    await row.scrollIntoViewIfNeeded();
    await row.hover();

    await expect
      .poll(() =>
        row.evaluate((element) => getComputedStyle(element).backgroundColor)
      )
      .not.toBe('rgba(0, 0, 0, 0)');

    const singButton = row.locator('.sing-button');
    await expect
      .poll(() =>
        singButton.evaluate(
          (element) => getComputedStyle(element).backgroundColor
        )
      )
      .toBe('rgb(20, 20, 20)');

    const titleTransform = await row
      .locator('.song-title')
      .evaluate((element) => getComputedStyle(element).transform);

    expect(titleTransform).not.toBe('none');
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

  test('records a play and refreshes the Na dziś list', async ({ page }) => {
    await gotoLibrary(page);

    await openPlayer(page);
    await page.locator('#back-button').click();

    await expect(page.locator('.recommended-song').first()).toContainText(
      'Last Christmas'
    );
    await expect(page.locator('.recommendation-plays').first()).toHaveText(
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
