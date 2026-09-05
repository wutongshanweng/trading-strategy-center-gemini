import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App';

// Global fetch interceptor to safely handle 429 Rate exceeded text responses
try {
  const originalFetch = window.fetch;
  if (typeof originalFetch === 'function') {
    const wrappedFetch = async function(...args: Parameters<typeof fetch>) {
      const res = await originalFetch.apply(window, args);
      if (res.status === 429) {
        const clone = res.clone();
        try {
          const text = await clone.text();
          if (text.includes('Rate exceeded')) {
            return new Response(JSON.stringify({ status: 'error', message: 'Rate exceeded.' }), {
              status: 429,
              statusText: 'Too Many Requests',
              headers: { 'Content-Type': 'application/json' }
            });
          }
        } catch {
          // Ignore clone errors
        }
      }
      return res;
    };

    try {
      Object.defineProperty(window, 'fetch', {
        value: wrappedFetch,
        writable: true,
        configurable: true
      });
    } catch {
      // Fallback if window.fetch is non-configurable getter in certain iframe sandboxes
      try {
        (globalThis as any).fetch = wrappedFetch;
      } catch {
        // Safe fallback
      }
    }
  }
} catch {
  // Silent fallback
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>
);
