import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Fade out the pre-React splash once the JS bundle executes
const splash = document.getElementById('splash');
if (splash) {
  splash.classList.add('fade-out');
  setTimeout(() => splash.remove(), 400);
}
