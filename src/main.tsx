import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { applyVisualSettings, loadGameSettings } from './lib/gameSettings.ts';
import './index.css';

applyVisualSettings(loadGameSettings());

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
