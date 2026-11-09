import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';
import './lib/ambient.js';

const root = createRoot(document.getElementById('root'));

root.render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
