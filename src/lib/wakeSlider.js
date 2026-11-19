const SETTLE = 9.23;
const FULL_SPEED = 320;
const MIN_REACH = 1.5;
const FLAT = 0.002;
const FRAME_STEP = 1 / 120;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const smoothstep = (value) => value * value * (3 - 2 * value);
const percentOf = (value, min, max) => ((value - min) / (max - min)) * 100;

function snap(value, min, max, step) {
  if (!(max > min)) return min;
  if (!(step > 0)) return clamp(value, min, max);
  const lastWhole = min + Math.floor(Number(((max - min) / step).toFixed(6))) * step;
  const grid = clamp(Math.round((value - min) / step) * step + min, min, lastWhole);
  const result = lastWhole < max && Math.abs(value - max) <= Math.abs(value - grid) ? max : grid;
  return Number(result.toFixed(6));
}

export class WakeSlider {
  constructor(host, options = {}) {
    this.host = host;
    this.options = {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.01,
      bars: 20,
      height: 36,
      restHeight: 8,
      gap: 2,
      fillColor: 'var(--accent)',
      trackColor: 'color-mix(in oklab, var(--text) 13%, transparent)',
      crestColor: 'color-mix(in oklab, var(--accent) 42%, transparent)',
      sensitivity: 1,
      reach: 6,
      skew: 0.6,
      glide: 0.3,
      smoothing: 100,
      showValue: true,
      formatValue: (value) => String(value),
      disabled: false,
      ariaLabel: 'Value',
      onChange: null,
      ...options,
    };

    if (!(this.options.max > this.options.min) || !(this.options.step > 0)) {
      throw new RangeError('WakeSlider requires max > min and a positive step.');
    }

    this.value = snap(this.options.value, this.options.min, this.options.max, this.options.step);
    this.targetPercent = percentOf(this.value, this.options.min, this.options.max);
    this.headPercent = this.targetPercent;
    this.velocity = 0;
    this.speed = 0;
    this.lastAmplitude = 0;
    this.pointerId = null;
    this.frame = 0;
    this.lastFrame = 0;
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.stiffness = (SETTLE / this.options.glide) ** 2;

    this.build();
    this.bind();
    this.paint(true);
  }

  build() {
    const root = document.createElement('div');
    root.className = 'wake-slider';
    root.setAttribute('aria-disabled', String(this.options.disabled));
    root.style.setProperty('--ws-fill', this.options.fillColor);
    root.style.setProperty('--ws-track', this.options.trackColor);
    root.style.setProperty('--ws-crest', this.options.crestColor || this.options.fillColor);
    root.style.setProperty('--ws-height', `${this.options.height}px`);
    root.style.setProperty('--ws-gap', `${this.options.gap}px`);
    root.style.setProperty('--ws-rest', String(Math.min(this.options.restHeight, this.options.height - 1) / this.options.height));

    const track = document.createElement('div');
    track.className = 'wake-slider__track';
    const bars = [];
    const crests = [];
    for (let index = 0; index < this.options.bars; index += 1) {
      const bar = document.createElement('span');
      bar.className = 'wake-slider__bar';
      const crest = this.options.crestColor ? document.createElement('span') : null;
      if (crest) {
        crest.className = 'wake-slider__crest';
        bar.append(crest);
      }
      track.append(bar);
      bars.push(bar);
      crests.push(crest);
    }

    const handle = document.createElement('button');
    handle.type = 'button';
    handle.className = 'wake-slider__handle';
    handle.setAttribute('role', 'slider');
    handle.setAttribute('aria-label', this.options.ariaLabel);
    handle.setAttribute('aria-valuemin', String(this.options.min));
    handle.setAttribute('aria-valuemax', String(this.options.max));
    handle.tabIndex = this.options.disabled ? -1 : 0;
    track.append(handle);

    let value = null;
    if (this.options.showValue) {
      value = document.createElement('span');
      value.className = 'wake-slider__value';
      value.setAttribute('aria-hidden', 'true');
      root.append(track, value);
    } else {
      root.append(track);
    }
    this.host.replaceChildren(root);

    this.root = root;
    this.track = track;
    this.handle = handle;
    this.bars = bars;
    this.crests = crests;
    this.valueOutput = value;
    this.syncAria();
  }

  bind() {
    this.onPointerDown = (event) => this.pointerDown(event);
    this.onPointerMove = (event) => this.pointerMove(event);
    this.onPointerUp = (event) => this.pointerUp(event);
    this.onLostPointerCapture = (event) => {
      if (event.pointerId === this.pointerId) this.endDrag();
    };
    this.onKeyDown = (event) => this.keyDown(event);
    this.track.addEventListener('pointerdown', this.onPointerDown);
    this.track.addEventListener('pointermove', this.onPointerMove);
    this.track.addEventListener('pointerup', this.onPointerUp);
    this.track.addEventListener('pointercancel', this.onPointerUp);
    this.track.addEventListener('lostpointercapture', this.onLostPointerCapture);
    this.handle.addEventListener('keydown', this.onKeyDown);
  }

  commit(value, instant = false) {
    const next = snap(value, this.options.min, this.options.max, this.options.step);
    const changed = next !== this.value;
    this.value = next;
    this.targetPercent = percentOf(next, this.options.min, this.options.max);
    this.syncAria();
    if (changed) this.options.onChange?.(next);
    if (instant || this.reducedMotion) {
      this.headPercent = this.targetPercent;
      this.velocity = 0;
      this.root.dataset.instant = 'true';
      this.paint(true);
      requestAnimationFrame(() => delete this.root.dataset.instant);
    } else {
      this.wake();
    }
  }

  setValue(value, { instant = false } = {}) {
    const next = snap(value, this.options.min, this.options.max, this.options.step);
    const targetPercent = percentOf(next, this.options.min, this.options.max);
    if (next === this.value && targetPercent === this.targetPercent) return;
    this.value = next;
    this.targetPercent = targetPercent;
    this.syncAria();
    if (instant || this.reducedMotion) {
      this.headPercent = targetPercent;
      this.velocity = 0;
      this.speed = 0;
      this.root.dataset.instant = 'true';
      this.paint(true);
      requestAnimationFrame(() => delete this.root.dataset.instant);
    } else {
      this.wake();
    }
  }

  commitFromX(clientX) {
    const bounds = this.track.getBoundingClientRect();
    if (!bounds.width) return;
    let ratio = clamp((clientX - bounds.left) / bounds.width, 0, 1);
    if (getComputedStyle(this.track).direction === 'rtl') ratio = 1 - ratio;
    this.commit(this.options.min + ratio * (this.options.max - this.options.min));
  }

  pointerDown(event) {
    if (this.options.disabled || this.pointerId !== null || (event.pointerType === 'mouse' && event.button !== 0)) return;
    this.pointerId = event.pointerId;
    try {
      this.track.setPointerCapture(event.pointerId);
    } catch {
      // Capture can be unavailable in older browsers.
    }
    event.preventDefault();
    this.root.removeAttribute('data-instant');
    this.handle.focus({ preventScroll: true });
    this.root.dataset.dragging = '';
    this.commitFromX(event.clientX);
  }

  pointerMove(event) {
    if (event.pointerId === this.pointerId) this.commitFromX(event.clientX);
  }

  pointerUp(event) {
    if (event.pointerId !== this.pointerId) return;
    const pointerId = this.pointerId;
    this.endDrag();
    try {
      this.track.releasePointerCapture(pointerId);
    } catch {
      // The browser may already have released capture.
    }
  }

  endDrag() {
    this.pointerId = null;
    delete this.root.dataset.dragging;
  }

  keyDown(event) {
    if (this.options.disabled) return;
    const value = this.value;
    const jumps = {
      ArrowRight: value + this.options.step,
      ArrowUp: value + this.options.step,
      ArrowLeft: value - this.options.step,
      ArrowDown: value - this.options.step,
      PageUp: value + this.options.step * 10,
      PageDown: value - this.options.step * 10,
      Home: this.options.min,
      End: this.options.max,
    };
    if (!(event.key in jumps)) return;
    event.preventDefault();
    this.commit(jumps[event.key], true);
  }

  syncAria() {
    this.handle.setAttribute('aria-valuenow', String(this.value));
    this.handle.setAttribute('aria-valuetext', this.options.formatValue(this.value));
    if (this.valueOutput) this.valueOutput.textContent = this.options.formatValue(this.value);
  }

  wake() {
    if (this.frame || this.reducedMotion) return;
    this.lastFrame = performance.now();
    this.frame = requestAnimationFrame((time) => this.tick(time));
  }

  tick(now) {
    const elapsed = clamp((now - this.lastFrame) / 1000, 0, 0.032);
    this.lastFrame = now;
    const previousHead = this.headPercent;
    const steps = Math.max(1, Math.ceil(elapsed / FRAME_STEP));
    const dt = elapsed / steps;
    const damping = (2 * Math.sqrt(this.stiffness)) * (1 - 0.2);
    for (let index = 0; index < steps; index += 1) {
      const acceleration = this.stiffness * (this.targetPercent - this.headPercent) - damping * this.velocity;
      this.velocity += acceleration * dt;
      this.headPercent += this.velocity * dt;
    }

    const rawSpeed = elapsed > 0 ? (this.headPercent - previousHead) / elapsed : 0;
    const smoothingTime = Math.max(1, this.options.smoothing) / 1000;
    this.speed += (rawSpeed - this.speed) * (1 - Math.exp(-elapsed / smoothingTime));

    const settling = Math.abs(this.targetPercent - this.headPercent) > 0.01 || Math.abs(this.velocity) > 0.05;
    if (!settling) {
      this.headPercent = this.targetPercent;
      this.velocity = 0;
      this.speed = 0;
    }
    this.paint();
    this.frame = settling ? requestAnimationFrame((time) => this.tick(time)) : 0;
  }

  paint(force = false) {
    const head = (this.headPercent / 100) * (this.options.bars - 1);
    const speed = this.reducedMotion ? 0 : this.speed;
    const amplitude = smoothstep(clamp((Math.abs(speed) * this.options.sensitivity) / FULL_SPEED, 0, 1));
    const direction = Math.sign(speed) || 1;
    const reach = MIN_REACH + (this.options.reach - MIN_REACH) * amplitude;
    const behind = reach * (1 + this.options.skew);
    const ahead = reach * (1 - 0.5 * this.options.skew);
    const lit = Math.round(head);
    const flat = !force && amplitude < FLAT && this.lastAmplitude < FLAT;

    this.bars.forEach((bar, index) => {
      const on = index <= lit ? 'true' : 'false';
      if (bar.dataset.on !== on) bar.dataset.on = on;
      if (flat) return;
      const distance = index - head;
      const radius = distance * direction < 0 ? behind : ahead;
      const lift = Math.abs(distance) < radius
        ? amplitude * Math.cos((Math.PI * distance) / (2 * radius)) ** 2
        : 0;
      bar.style.transform = `scaleY(${this.rest + lift * (1 - this.rest)})`;
      if (this.crests[index]) this.crests[index].style.opacity = String(lift);
    });
    this.lastAmplitude = amplitude;
  }

  get rest() {
    return Math.min(this.options.restHeight, this.options.height - 1) / this.options.height;
  }

  destroy() {
    if (this.frame) cancelAnimationFrame(this.frame);
    this.track.removeEventListener('pointerdown', this.onPointerDown);
    this.track.removeEventListener('pointermove', this.onPointerMove);
    this.track.removeEventListener('pointerup', this.onPointerUp);
    this.track.removeEventListener('pointercancel', this.onPointerUp);
    this.track.removeEventListener('lostpointercapture', this.onLostPointerCapture);
    this.handle.removeEventListener('keydown', this.onKeyDown);
    this.host.replaceChildren();
  }
}