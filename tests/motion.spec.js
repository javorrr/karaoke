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

const scrollIntoView = (page, selector) =>
  page
    .locator(selector)
    .evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
    );

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
    await gotoLibrary(page);
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

  test('keeps content visible and suppresses pointer motion', async ({
    page,
  }) => {
    await gotoLibrary(page);

    const state = await page.evaluate(() => ({
      motionReady: document.documentElement.classList.contains('motion-ready'),
      pendingReveals: document.querySelectorAll('[data-reveal]').length,
      rowOpacity: getComputedStyle(document.querySelector('.song-row')).opacity,
      sectionAnimation: getComputedStyle(
        document.querySelector('.filters-panel')
      ).animationName,
    }));

    expect(state.motionReady).toBe(true);
    expect(state.pendingReveals).toBe(0);
    expect(Number(state.rowOpacity)).toBe(1);
    expect(state.sectionAnimation).toBe('none');

    const card = page.locator('.recommended-song').first();
    await card.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
    );
    await page.waitForTimeout(200);
    const cardBox = await card.boundingBox();
    await page.mouse.move(
      cardBox.x + cardBox.width / 2,
      cardBox.y + cardBox.height / 2
    );

    await page.evaluate(() =>
      window.scrollTo({ top: 0, behavior: 'instant' })
    );
    await page.waitForTimeout(200);
    const heroBox = await page.locator('.hero-layout').boundingBox();
    await page.mouse.move(
      heroBox.x + heroBox.width * 0.75,
      heroBox.y + heroBox.height * 0.3
    );
    await page.waitForTimeout(100);

    const pointer = await page.evaluate(() => ({
      tilt: document
        .querySelector('.recommended-song')
        .style.getPropertyValue('--tilt-y'),
      hero: document
        .querySelector('.hero-signal')
        .style.getPropertyValue('--hero-px'),
    }));

    expect(pointer.tilt).toBe('');
    expect(pointer.hero).toBe('');
  });

  test('does not start a view transition', async ({ page }) => {
    await gotoLibrary(page);

    const supported = await page.evaluate(() => {
      if (typeof document.startViewTransition !== 'function') return false;

      window.__viewTransitionCalls = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (...args) => {
        window.__viewTransitionCalls += 1;
        return original(...args);
      };
      return true;
    });

    test.skip(!supported, 'View Transitions API is not supported');

    await openPlayer(page);

    expect(await page.evaluate(() => window.__viewTransitionCalls)).toBe(0);
  });

  test('suppresses the lyric teleprompter motion', async ({ page }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    const motion = await page.evaluate(() => ({
      phrase: getComputedStyle(document.querySelector('.lyrics-phrase'))
        .animationName,
      active: getComputedStyle(document.querySelector('.lyrics-line.active'))
        .animationName,
      glyph: getComputedStyle(document.querySelector('.play-glyph'))
        .animationName,
    }));

    expect(motion.phrase).toBe('none');
    expect(motion.active).toBe('none');
    expect(motion.glyph).toBe('none');
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

  test('reveals rows and cards as they enter the viewport', async ({
    page,
  }) => {
    await gotoLibrary(page);

    await scrollIntoView(page, '.recommended-list');
    await page.waitForTimeout(800);
    await expect
      .poll(() =>
        page
          .locator('.recommended-song')
          .first()
          .evaluate((element) => element.classList.contains('is-revealed'))
      )
      .toBe(true);

    await scrollIntoView(page, '#songs-list');
    await page.waitForTimeout(800);
    await expect
      .poll(() =>
        page
          .locator('.song-row')
          .first()
          .evaluate((element) => element.classList.contains('is-revealed'))
      )
      .toBe(true);

    const opacity = await page
      .locator('.song-row')
      .first()
      .evaluate((element) => getComputedStyle(element).opacity);
    expect(Number(opacity)).toBeGreaterThan(0.99);
  });

  test('reveals items skipped by an anchor jump', async ({ page }) => {
    await gotoLibrary(page);

    await scrollIntoView(page, '#songs-list');
    await page.waitForTimeout(600);

    const hidden = await page.evaluate(
      () =>
        [
          ...document.querySelectorAll(
            '.recommended-song, .popular-song'
          ),
        ].filter(
          (element) => !element.classList.contains('is-revealed')
        ).length
    );

    expect(hidden).toBe(0);
  });

  test('adds pointer tilt and hero parallax', async ({ page, hasTouch }) => {
    test.skip(hasTouch, 'pointer-fine motion only');

    await gotoLibrary(page);
    await page.waitForTimeout(1400);

    const heroBox = await page.locator('.hero-layout').boundingBox();
    await page.mouse.move(
      heroBox.x + heroBox.width * 0.75,
      heroBox.y + heroBox.height * 0.3
    );
    await page.waitForTimeout(150);

    const heroOffset = await page.evaluate(() =>
      document
        .querySelector('.hero-signal')
        .style.getPropertyValue('--hero-px')
    );
    expect(heroOffset).not.toBe('');

    const card = page.locator('.recommended-song').first();
    await card.evaluate((element) =>
      element.scrollIntoView({ block: 'center', behavior: 'instant' })
    );
    await page.waitForTimeout(300);
    const cardBox = await card.boundingBox();
    await page.mouse.move(
      cardBox.x + cardBox.width * 0.8,
      cardBox.y + cardBox.height * 0.2
    );
    await page.waitForTimeout(300);

    const tilt = await page.evaluate(() => {
      const element = document.querySelector('.recommended-song');
      return {
        y: element.style.getPropertyValue('--tilt-y'),
        glow: element.style.getPropertyValue('--glow-x'),
      };
    });

    expect(tilt.y).not.toBe('');
    expect(tilt.glow).not.toBe('');
  });

  test('uses the View Transitions API for view swaps', async ({ page }) => {
    await gotoLibrary(page);

    const supported = await page.evaluate(() => {
      if (typeof document.startViewTransition !== 'function') return false;

      window.__viewTransitionCalls = 0;
      const original = document.startViewTransition.bind(document);
      document.startViewTransition = (...args) => {
        window.__viewTransitionCalls += 1;
        return original(...args);
      };
      return true;
    });

    test.skip(!supported, 'View Transitions API is not supported');

    await openPlayer(page);

    expect(await page.evaluate(() => window.__viewTransitionCalls)).toBe(1);
  });

  test('animates the lyric teleprompter', async ({ page }) => {
    await gotoLibrary(page);
    await openPlayer(page);

    const motion = await page.evaluate(() => ({
      phrase: getComputedStyle(document.querySelector('.lyrics-phrase'))
        .animationName,
      active: getComputedStyle(document.querySelector('.lyrics-line.active'))
        .animationName,
      glyph: getComputedStyle(document.querySelector('.play-glyph'))
        .animationName,
    }));

    expect(motion.phrase).toBe('phrase-in');
    expect(motion.active).toBe('lyric-hit');
    expect(motion.glyph).toBe('glyph-in');
  });

  test('stamps the player in and lights the playing state', async ({
    page,
  }) => {
    await gotoLibrary(page);
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
    await expect(page.locator('.pause-glyph')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            getComputedStyle(document.querySelector('.play-button')).animationName
        )
      )
      .toBe('play-glow');

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
