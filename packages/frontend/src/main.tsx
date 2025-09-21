import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Start MSW in development mode
async function enableMocking() {
  if (import.meta.env.DEV) {
    const { startMocking } = await import('./mocks');
    return startMocking();
  }
}

enableMocking().then(() => {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});