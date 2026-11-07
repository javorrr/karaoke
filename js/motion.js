/* ==========================================================================
   SCENA — MOTION ENHANCERS
   Progressive interaction layers for the CSS motion system: view transitions,
   scroll reveals, pointer tilt and hero parallax. Everything is reduce-safe.
   ========================================================================== */

const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(pointer: fine)');

export const prefersReducedMotion = () => reduceMotionQuery.matches;

document.documentElement.classList.add('motion-ready');

let revealObserver = null;
let passedFrame = 0;
const pendingReveals = new Set();

function revealElement(element, index = 0) {
  element.style.setProperty('--reveal-index', String(Math.min(index, 10)));
  element.classList.add('is-revealed');
  pendingReveals.delete(element);
  revealObserver?.unobserve(element);
}

function revealPassed() {
  passedFrame = 0;
  if (!pendingReveals.size) return;

  pendingReveals.forEach((element) => {
    if (element.getBoundingClientRect().bottom <= 0) {
      revealElement(element);
    }
  });
}

function schedulePassedReveal() {
  if (!pendingReveals.size || passedFrame) return;
  passedFrame = requestAnimationFrame(revealPassed);
}

function getRevealObserver() {
  if (revealObserver || typeof IntersectionObserver === 'undefined') {
    return revealObserver;
  }

  revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const index = entries.indexOf(entry);
          revealElement(entry.target, index);
          return;
        }

        // A jump (anchor, scroll restoration) can skip an item entirely.
        // Items that are already above the viewport are revealed silently so
        // they never remain invisible when the visitor scrolls back up.
        if (entry.boundingClientRect.bottom <= 0) {
          revealElement(entry.target);
        }
      });
    },
    {
      rootMargin: '0px 0px -6% 0px',
      threshold: 0.01
    }
  );

  window.addEventListener('scroll', schedulePassedReveal, { passive: true });
  window.addEventListener('resize', schedulePassedReveal, { passive: true });
  requestAnimationFrame(revealPassed);

  return revealObserver;
}

/**
 * Marks freshly rendered items for a staggered entrance. Items are hidden by
 * CSS only while JS is ready and motion is allowed, so no-JS and reduced-motion
 * users always receive the final, readable state.
 */
export function reveal(elements) {
  const list = elements instanceof Element ? [elements] : [...elements];
  if (!list.length) return;

  if (
    prefersReducedMotion() ||
    typeof IntersectionObserver === 'undefined'
  ) {
    list.forEach((element) => element.classList.add('is-revealed'));
    return;
  }

  const observer = getRevealObserver();

  list.forEach((element) => {
    if (element.classList.contains('is-revealed')) return;
    element.dataset.reveal = '';
    pendingReveals.add(element);
    observer.observe(element);
  });
}

export function clearReveals(scope) {
  if (!revealObserver || !scope) return;

  scope.querySelectorAll('[data-reveal]').forEach((element) => {
    revealObserver.unobserve(element);
    pendingReveals.delete(element);
  });
}

/**
 * Runs a DOM swap through the View Transitions API when it is available and
 * the visitor has not asked for reduced motion. The callback always runs.
 */
export function withViewTransition(update) {
  if (
    typeof document.startViewTransition !== 'function' ||
    prefersReducedMotion()
  ) {
    update();
    return null;
  }

  let ran = false;
  const run = () => {
    ran = true;
    update();
  };

  try {
    return document.startViewTransition(run);
  } catch {
    if (!ran) run();
    return null;
  }
}

/**
 * A restrained 3D response on recommendation cards. The card keeps its
 * printed-poster transform; the tilt is an additional pointer-only layer.
 */
export function enableCardTilt(selector = '.recommended-song') {
  if (prefersReducedMotion() || !finePointerQuery.matches) return;

  let activeCard = null;
  let activeRect = null;
  let pointerEvent = null;
  let frame = 0;

  const reset = () => {
    if (!activeCard) return;

    activeCard.style.removeProperty('--tilt-x');
    activeCard.style.removeProperty('--tilt-y');
    activeCard.style.removeProperty('--glow-x');
    activeCard.style.removeProperty('--glow-y');
    activeCard = null;
    activeRect = null;
    pointerEvent = null;
  };

  const paint = () => {
    frame = 0;
    if (!activeCard || !activeRect || !pointerEvent) return;

    const x = Math.min(
      Math.max((pointerEvent.clientX - activeRect.left) / activeRect.width, 0),
      1
    );
    const y = Math.min(
      Math.max((pointerEvent.clientY - activeRect.top) / activeRect.height, 0),
      1
    );

    activeCard.style.setProperty('--tilt-y', `${(x - 0.5) * 5}deg`);
    activeCard.style.setProperty('--tilt-x', `${(0.5 - y) * 4}deg`);
    activeCard.style.setProperty('--glow-x', `${x * 100}%`);
    activeCard.style.setProperty('--glow-y', `${y * 100}%`);
  };

  document.addEventListener(
    'pointerover',
    (event) => {
      if (!(event.target instanceof Element)) return;

      const card = event.target.closest(selector);
      if (!card || card === activeCard) return;

      reset();
      activeCard = card;
      activeRect = card.getBoundingClientRect();
    },
    { passive: true }
  );

  document.addEventListener(
    'pointermove',
    (event) => {
      if (!activeCard) return;

      pointerEvent = event;
      if (!frame) frame = requestAnimationFrame(paint);
    },
    { passive: true }
  );

  document.addEventListener(
    'pointerout',
    (event) => {
      if (activeCard && !activeCard.contains(event.relatedTarget)) reset();
    },
    { passive: true }
  );

  window.addEventListener('scroll', reset, { passive: true });
  window.addEventListener('blur', reset);
}

/**
 * A few pixels of pointer-led depth on the decorative hero signal. It is
 * layered on top of the existing scroll-driven drift, never replacing it.
 */
export function enableHeroParallax() {
  if (prefersReducedMotion() || !finePointerQuery.matches) return;

  const hero = document.querySelector('.hero-layout');
  const signal = document.querySelector('.hero-signal');
  if (!hero || !signal) return;

  let frame = 0;
  let nextX = 0;
  let nextY = 0;

  hero.addEventListener(
    'pointermove',
    (event) => {
      const rect = hero.getBoundingClientRect();
      nextX = ((event.clientX - rect.left) / rect.width - 0.5) * 14;
      nextY = ((event.clientY - rect.top) / rect.height - 0.5) * 12;

      if (frame) return;

      frame = requestAnimationFrame(() => {
        frame = 0;
        signal.style.setProperty('--hero-px', `${nextX}px`);
        signal.style.setProperty('--hero-py', `${nextY}px`);
      });
    },
    { passive: true }
  );

  hero.addEventListener('pointerleave', () => {
    signal.style.setProperty('--hero-px', '0px');
    signal.style.setProperty('--hero-py', '0px');
  });
}
