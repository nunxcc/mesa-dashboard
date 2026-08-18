import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

// Self-hosted variable fonts. Imported here rather than via an @import in CSS
// so Vite fingerprints and preloads them, and so the app has no runtime
// dependency on a third-party CDN.
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';

import './styles/global.css';
import { App } from './app/App';

const container = document.getElementById('root');
if (!container) throw new Error('Root element #root is missing from index.html');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
