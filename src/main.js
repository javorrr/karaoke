import Lenis from 'lenis';
import { KaraokeApp } from './app.js';
import './lib/ambient.js';

const root = document.getElementById('root');

if (root) {
  const app = new KaraokeApp(root);
  const lenis = new Lenis({
    autoRaf: true,
    anchors: true,
    respectReducedMotion: true,
  });
  const publishProgress = (instance) => {
    const progress = Number.isFinite(instance.progress) ? instance.progress : 0;
    document.documentElement.style.setProperty(
      '--lenis-progress',
      progress.toFixed(4)
    );
  };

  lenis.on('scroll', publishProgress);
  publishProgress(lenis);
  window.__lenis = lenis;

  window.addEventListener('pagehide', () => {
    app.destroy();
    lenis.off('scroll', publishProgress);
    lenis.destroy();
    delete window.__lenis;
    document.documentElement.style.removeProperty('--lenis-progress');
  }, { once: true });
}