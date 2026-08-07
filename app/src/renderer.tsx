import React from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { installThemeEffect } from './store/theme';
import './styles/tokens.css';
import './styles/global.css';

// Apply the persisted theme (and follow prefers-color-scheme when 'system'
// is selected). Must run before first paint so we don't flash the wrong
// theme on cold start.
installThemeEffect();

const container = document.getElementById('root');
if (!container) {
  throw new Error('No #root element found in index.html');
}

createRoot(container).render(
  <React.StrictMode>
    <ErrorBoundary>
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);
