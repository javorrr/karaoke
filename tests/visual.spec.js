import { test, expect } from '@playwright/test';
import { gotoLibrary, openPlayer } from './helpers.js';

async function settleAtTop(page) {
  await page.evaluate(() => {
    const root = document.documentElement;
    const previous = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';
    window.scrollTo(0, 0);
    root.style.scrollBehavior = previous;
  });
  await page.waitForFunction(() => window.scrollY === 0);
}

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
    const row = page.locator('.song-row').first();
    await row.scrollIntoViewIfNeeded();
    await row.hover();

    await expect(page).toHaveScreenshot('library-hover.png');
  });

  test('library — focus-visible search', async ({ page }) => {
    await gotoLibrary(page);
    await page.locator('#song-search').focus();
    await settleAtTop(page);

    await expect(page).toHaveScreenshot('library-focus.png', {
      fullPage: true,
    });
  });

  test('player — open', async ({ page }) => {
    await gotoLibrary(page);
    await openPlayer(page);
    await settleAtTop(page);
    await page.addStyleTag({
      content: '#current-time, #duration { visibility: hidden; }',
    });

    await expect(page).toHaveScreenshot('player-open.png', {
      fullPage: true,
    });
  });
});
