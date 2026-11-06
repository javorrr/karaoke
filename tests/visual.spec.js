import { test, expect } from '@playwright/test';
import { gotoLibrary, openPlayer } from './helpers.js';

test.describe('visual regression', () => {
  test('library — default', async ({ page }) => {
    await gotoLibrary(page);

    await expect(page).toHaveScreenshot('library-default.png', {
      fullPage: true,
    });
  });

  test('library — hovered setlist row', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'hover states require a hover-capable pointer');

    await gotoLibrary(page);
    await page.locator('.song-row').first().hover();

    await expect(page).toHaveScreenshot('library-hover.png', {
      fullPage: true,
    });
  });

  test('library — focus-visible search', async ({ page }) => {
    await gotoLibrary(page);
    await page.locator('#song-search').focus();

    await expect(page).toHaveScreenshot('library-focus.png', {
      fullPage: true,
    });
  });

  test('player — open', async ({ page }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    await expect(page).toHaveScreenshot('player-open.png', {
      fullPage: true,
      mask: [page.locator('#current-time'), page.locator('#duration')],
    });
  });
});
