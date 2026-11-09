import { useEffect } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function useMagnetic(ref, strength = 10) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!finePointer.matches || reduceMotion.matches) return undefined;

    const reset = () => {
      element.style.setProperty('--magnet-x', '0px');
      element.style.setProperty('--magnet-y', '0px');
    };

    const onMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      element.style.setProperty(
        '--magnet-x',
        `${clamp(x * strength * 2, -strength, strength)}px`
      );
      element.style.setProperty(
        '--magnet-y',
        `${clamp(y * strength * 0.7, -strength / 2, strength / 2)}px`
      );
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', reset);

    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', reset);
    };
  }, [ref, strength]);
}
