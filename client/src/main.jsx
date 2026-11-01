import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// The static splash in index.html covers the gap before the bundle runs.
// Hand over to React's own splash with a short fade instead of a hard cut.
const splash = document.getElementById('splash');
if (splash) {
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 400);
}
