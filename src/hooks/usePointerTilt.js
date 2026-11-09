import { useEffect } from 'react';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function usePointerTilt(ref, maxTilt = 5) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    if (!finePointer.matches || reduceMotion.matches) return undefined;

    const reset = () => {
      element.style.setProperty('--tilt-x', '0deg');
      element.style.setProperty('--tilt-y', '0deg');
    };

    const onMove = (event) => {
      const rect = element.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;

      element.style.setProperty(
        '--tilt-y',
        `${clamp(x * maxTilt * 2, -maxTilt, maxTilt)}deg`
      );
      element.style.setProperty(
        '--tilt-x',
        `${clamp(-y * maxTilt * 2, -maxTilt, maxTilt)}deg`
      );
    };

    element.addEventListener('pointermove', onMove);
    element.addEventListener('pointerleave', reset);

    return () => {
      element.removeEventListener('pointermove', onMove);
      element.removeEventListener('pointerleave', reset);
    };
  }, [ref, maxTilt]);
}
