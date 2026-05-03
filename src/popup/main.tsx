// In dev mode, load Chrome API mocks before anything else
if (import.meta.env.DEV) {
  await import('./chrome-mock');
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './styles.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
