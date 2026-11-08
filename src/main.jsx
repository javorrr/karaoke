import { createRoot } from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import App from './App.jsx';

const root = createRoot(document.getElementById('root'));

root.render(
  <MotionConfig reducedMotion="user">
    <App />
  </MotionConfig>
);
