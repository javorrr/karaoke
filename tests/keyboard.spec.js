import { test, expect } from '@playwright/test';
import { gotoLibrary, openPlayer } from './helpers.js';

test.describe('keyboard', () => {
  test('reveals the skip link and moves focus to the main landmark', async ({
    page,
  }) => {
    await gotoLibrary(page);

    await page.keyboard.press('Tab');

    const skipLink = page.locator('.skip-link');
    await expect(skipLink).toBeFocused();

    const box = await skipLink.boundingBox();
    expect(box).not.toBeNull();
    expect(box.y).toBeGreaterThanOrEqual(0);

    await page.keyboard.press('Enter');

    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('tabs through the search, filter and recommendation controls', async ({
    page,
  }) => {
    await gotoLibrary(page);

    await page.locator('#song-search').focus();
    await page.keyboard.press('Tab');
    await expect(page.locator('#genre-filter')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#language-filter')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('#decade-filter')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('.recommended-song').first()).toBeFocused();
  });

  test('seeks from a lyric with Enter and Space', async ({ page }) => {
    await openPlayer(page);

    await page.locator('.lyrics-line').nth(2).focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#current-time')).toHaveText('00:05');
    await expect(page.locator('.lyrics-line').nth(2)).toHaveClass(/active/);

    await page.locator('.lyrics-line').nth(3).focus();
    await page.keyboard.press('Space');
    await expect(page.locator('#current-time')).toHaveText('00:08');
    await expect(page.locator('.lyrics-line').nth(3)).toHaveClass(/active/);
  });

  test('supports Home and End on the timeline and volume sliders', async ({
    page,
  }) => {
    await openPlayer(page);

    await page.locator('#progress-slider').focus();
    await page.keyboard.press('End');
    await expect(page.locator('#progress-slider')).toHaveValue('12');
    await expect(page.locator('#current-time')).toHaveText('00:12');

    await page.keyboard.press('Home');
    await expect(page.locator('#progress-slider')).toHaveValue('0');
    await expect(page.locator('#current-time')).toHaveText('00:00');

    await page.locator('#volume-slider').focus();
    await page.keyboard.press('Home');
    await expect(page.locator('#volume-slider')).toHaveValue('0');
    await expect(page.locator('#mute-button')).toHaveText('muted');
  });

  test('shows a visible focus ring on the search field', async ({ page }) => {
    await gotoLibrary(page);

    await page.locator('#song-search').focus();

    const focus = await page.locator('#song-search').evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        focusVisible: element.matches(':focus-visible'),
        outlineStyle: styles.outlineStyle,
        outlineWidth: Number.parseFloat(styles.outlineWidth),
      };
    });

    expect(focus.focusVisible).toBe(true);
    expect(focus.outlineStyle).toBe('solid');
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
  });

  test('shows a visible focus ring on the player transport', async ({
    page,
  }) => {
    await openPlayer(page);

    await page.locator('#back-button').focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    await expect(page.locator('#play-button')).toBeFocused();

    const focus = await page.locator('#play-button').evaluate((element) => {
      const styles = getComputedStyle(element);
      return {
        focusVisible: element.matches(':focus-visible'),
        outlineStyle: styles.outlineStyle,
        outlineWidth: Number.parseFloat(styles.outlineWidth),
      };
    });

    expect(focus.focusVisible).toBe(true);
    expect(focus.outlineStyle).toBe('solid');
    expect(focus.outlineWidth).toBeGreaterThanOrEqual(2);
  });

  test('returns to the library from the back button with the keyboard', async ({
    page,
  }) => {
    await openPlayer(page);

    await page.locator('#back-button').focus();
    await page.keyboard.press('Enter');

    await expect(page.locator('#library-view')).toBeVisible();
    await expect(page.locator('#player-view')).toBeHidden();
  });
});
