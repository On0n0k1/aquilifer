import React from 'react';
import ReactDOM from 'react-dom/client';
import { applyUiPreferences } from '../../lib/apply-ui-preferences';
import App from './App.tsx';
import './style.css';

applyUiPreferences().finally(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
});
