import { useCallback } from 'react';
import { flushSync } from 'react-dom';
import { useReducedMotion } from 'motion/react';

export function useViewTransition() {
  const reduceMotion = useReducedMotion();

  return useCallback(
    (update) => {
      if (
        reduceMotion ||
        typeof document.startViewTransition !== 'function'
      ) {
        update();
        return;
      }

      let ran = false;
      const run = () => {
        ran = true;
        flushSync(update);
      };

      try {
        document.startViewTransition(run);
      } catch {
        if (!ran) update();
      }
    },
    [reduceMotion]
  );
}
