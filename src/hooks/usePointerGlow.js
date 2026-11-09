import { useEffect } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function usePointerGlow(ref) {
  useEffect(() => {
    const list = ref.current;
    if (!list) return undefined;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!finePointer.matches) return undefined;

    let frame = 0;
    let lastEvent = null;

    const paint = () => {
      frame = 0;
      if (!lastEvent) return;

      const row = lastEvent.target.closest?.('.song-row');
      if (!row || !list.contains(row)) return;

      const rect = row.getBoundingClientRect();
      row.style.setProperty(
        '--glow-x',
        `${clamp(((lastEvent.clientX - rect.left) / rect.width) * 100, 0, 100)}%`
      );
      row.style.setProperty(
        '--glow-y',
        `${clamp(((lastEvent.clientY - rect.top) / rect.height) * 100, 0, 100)}%`
      );
    };

    const onMove = (event) => {
      lastEvent = event;
      if (frame) return;
      frame = window.requestAnimationFrame(paint);
    };

    const onLeave = () => {
      list.querySelectorAll('.song-row').forEach((row) => {
        row.style.removeProperty('--glow-x');
        row.style.removeProperty('--glow-y');
      });
    };

    list.addEventListener('pointermove', onMove, { passive: true });
    list.addEventListener('pointerleave', onLeave);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      list.removeEventListener('pointermove', onMove);
      list.removeEventListener('pointerleave', onLeave);
    };
  }, [ref]);
}
