import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/ui/App';
import './index.css';

// 앱 진입점 — React 루트 마운트
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
