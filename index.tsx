import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Redirect clean URL path /store/slug to HashRouter equivalent /#/store/slug
if (window.location.pathname.startsWith('/store')) {
  const cleanPath = window.location.pathname.substring(6);
  window.location.replace(window.location.origin + '/#/store' + cleanPath + window.location.search);
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);