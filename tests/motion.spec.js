import { test, expect } from '@playwright/test';
import { gotoLibrary, openPlayer } from './helpers.js';

const seconds = (value) => Number.parseFloat(value);

const instrumentViewTransitions = (page) =>
  page.evaluate(() => {
    if (typeof document.startViewTransition !== 'function') return false;

    window.__viewTransitionCalls = 0;
    const original = document.startViewTransition.bind(document);
    document.startViewTransition = (...args) => {
      window.__viewTransitionCalls += 1;
      return original(...args);
    };
    return true;
  });

test.describe('reduced motion', () => {
  test('keeps content visible and disables smooth scrolling', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const state = await page.evaluate(() => ({
      scrollBehavior: getComputedStyle(document.documentElement)
        .scrollBehavior,
      rowOpacity: getComputedStyle(document.querySelector('.song-row')).opacity,
      recommendationOpacity: getComputedStyle(
        document.querySelector('.recommended-song')
      ).opacity,
      rowTransition: getComputedStyle(document.querySelector('.song-row'))
        .transitionDuration,
      scrollReveal: getComputedStyle(
        document.querySelector('.list-heading')
      ).animationName,
    }));

    expect(state.scrollBehavior).toBe('auto');
    expect(Number(state.rowOpacity)).toBe(1);
    expect(Number(state.recommendationOpacity)).toBe(1);
    expect(seconds(state.rowTransition)).toBeLessThanOrEqual(0.00002);
    expect(state.scrollReveal).toBe('none');
  });

  test('suppresses the player entrance and scroll-driven chrome', async ({
    page,
  }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    const motion = await page.evaluate(() => {
      const panel = getComputedStyle(document.querySelector('.player-panel'));
      const header = getComputedStyle(
        document.querySelector('.site-header'),
        '::after'
      );
      const phrase = getComputedStyle(document.querySelector('.lyrics-phrase'));
      return {
        panelTransition: panel.transitionDuration,
        headerAnimation: header.animationName,
        phraseOpacity: phrase.opacity,
      };
    });

    expect(seconds(motion.panelTransition)).toBeLessThanOrEqual(0.00002);
    expect(motion.headerAnimation).toBe('none');
    expect(Number(motion.phraseOpacity)).toBe(1);
  });

  test('does not start a view transition', async ({ page }) => {
    await gotoLibrary(page);

    test.skip(
      !(await instrumentViewTransitions(page)),
      'View Transitions API is not supported'
    );

    await openPlayer(page);

    expect(await page.evaluate(() => window.__viewTransitionCalls)).toBe(0);
  });
});

test.describe('full motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('reveals sections with a scroll-driven animation', async ({ page }) => {
    await gotoLibrary(page);

    const supported = await page.evaluate(() =>
      CSS.supports('animation-timeline: view()')
    );
    test.skip(!supported, 'animation-timeline is not supported');

    const rule = await page.evaluate(() => {
      const styles = getComputedStyle(
        document.querySelector('.list-heading')
      );
      return {
        name: styles.animationName,
        timeline: styles.animationTimeline,
      };
    });

    expect(rule.name).toBe('section-rise');
    expect(rule.timeline).toContain('view');
  });

  test('extends the header rule with scroll progress', async ({ page }) => {
    await gotoLibrary(page);

    const supported = await page.evaluate(() =>
      CSS.supports('animation-timeline: scroll()')
    );
    test.skip(!supported, 'animation-timeline is not supported');

    const rule = await page.evaluate(() => {
      const styles = getComputedStyle(
        document.querySelector('.site-header'),
        '::after'
      );
      return {
        name: styles.animationName,
        timeline: styles.animationTimeline,
      };
    });

    expect(rule.name).toBe('header-progress');
    expect(rule.timeline).toContain('scroll');
  });

  test('fades the player panel in on entry', async ({ page }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    const transition = await page
      .locator('.player-panel')
      .evaluate((element) => getComputedStyle(element).transitionDuration);

    expect(seconds(transition)).toBeGreaterThan(0.1);
  });

  test('uses the View Transitions API for view swaps', async ({ page }) => {
    await gotoLibrary(page);

    test.skip(
      !(await instrumentViewTransitions(page)),
      'View Transitions API is not supported'
    );

    await openPlayer(page);

    expect(await page.evaluate(() => window.__viewTransitionCalls)).toBe(1);
  });

  test('keeps the playing state calm', async ({ page }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    await page.locator('#play-button').click();
    await expect(page.locator('.pause-glyph')).toBeVisible();

    const animation = await page
      .locator('.play-button')
      .evaluate((element) => getComputedStyle(element).animationName);

    expect(animation).toBe('none');
  });
});
