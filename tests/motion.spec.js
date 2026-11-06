import { test, expect } from '@playwright/test';
import { gotoLibrary, openPlayer } from './helpers.js';

const readMotion = (page) =>
  page.evaluate(() => {
    const read = (selector, pseudo = null) => {
      const element = document.querySelector(selector);
      const styles = getComputedStyle(element, pseudo);
      return {
        name: styles.animationName,
        duration: styles.animationDuration,
        iterations: styles.animationIterationCount,
        transition: styles.transitionDuration,
      };
    };

    return {
      hero: read('.intro h1'),
      live: read('.live-dot'),
      cue: read('.scroll-cue-icon'),
      scrollBehavior: getComputedStyle(document.documentElement)
        .scrollBehavior,
    };
  });

const seconds = (value) => Number.parseFloat(value);

test.describe('reduced motion', () => {
  test('suppresses ambient and authored library motion', async ({ page }) => {
    await gotoLibrary(page);

    const motion = await readMotion(page);

    expect(motion.live.name).toBe('none');
    expect(motion.cue.name).toBe('none');
    expect(motion.scrollBehavior).toBe('auto');
    expect(seconds(motion.hero.duration)).toBeLessThanOrEqual(0.00002);
    expect(seconds(motion.hero.transition)).toBeLessThanOrEqual(0.00002);
  });

  test('suppresses the player entrance and the playing glow', async ({
    page,
  }) => {
    await openPlayer(page);

    const entrance = await page.evaluate(() => {
      const art = getComputedStyle(document.querySelector('.player-art'));
      const panel = getComputedStyle(document.querySelector('.player-panel'));
      return {
        artDuration: art.animationDuration,
        panelTransition: panel.transitionDuration,
      };
    });

    expect(seconds(entrance.artDuration)).toBeLessThanOrEqual(0.00002);
    expect(seconds(entrance.panelTransition)).toBeLessThanOrEqual(0.00002);

    await page.locator('#play-button').click();

    const playing = await page.evaluate(() => {
      const button = getComputedStyle(document.querySelector('.play-button'));
      const wave = getComputedStyle(
        document.querySelector('.player-art-wave')
      );
      return { button: button.animationName, wave: wave.animationName };
    });

    expect(playing.button).toBe('none');
    expect(playing.wave).toBe('none');
  });
});

test.describe('full motion', () => {
  test.use({ reducedMotion: 'no-preference' });

  test('runs the authored library entrances and ambient loops', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const motion = await readMotion(page);

    expect(motion.hero.name).toBe('ink-pull');
    expect(seconds(motion.hero.duration)).toBeGreaterThan(0.5);
    expect(motion.live.name).toBe('live-pulse');
    expect(motion.live.iterations).toBe('infinite');
    expect(motion.cue.name).toBe('cue-bob');
    expect(motion.scrollBehavior).toBe('smooth');
  });

  test('stamps the player in and lights the playing state', async ({
    page,
  }) => {
    await openPlayer(page);

    const entrance = await page.evaluate(() => {
      const art = getComputedStyle(document.querySelector('.player-art'));
      const panel = getComputedStyle(document.querySelector('.player-panel'));
      return {
        artName: art.animationName,
        artDuration: art.animationDuration,
        panelTransition: panel.transitionDuration,
      };
    });

    expect(entrance.artName).toBe('stamp-in');
    expect(seconds(entrance.artDuration)).toBeGreaterThan(0.5);
    expect(seconds(entrance.panelTransition)).toBeGreaterThan(0.1);

    await page.locator('#play-button').click();

    const playing = await page.evaluate(() => {
      const button = getComputedStyle(document.querySelector('.play-button'));
      const wave = getComputedStyle(
        document.querySelector('.player-art-wave')
      );
      return {
        button: button.animationName,
        wave: wave.animationName,
        waveIterations: wave.animationIterationCount,
      };
    });

    expect(playing.button).toBe('play-glow');
    expect(playing.wave).toBe('wave-shift');
    expect(playing.waveIterations).toBe('infinite');
  });

  test('binds the scroll-driven header rule when supported', async ({
    page,
  }) => {
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

    expect(rule.name).toBe('header-rule');
    expect(rule.timeline).toContain('scroll');
  });
});
