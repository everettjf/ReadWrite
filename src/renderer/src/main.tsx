import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App } from './App';
import { SettingsApp } from './SettingsApp';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

const rootEl = document.getElementById('root');
if (!rootEl) throw new Error('root element missing');

const isSettingsRoute = window.location.hash.replace(/^#/, '').startsWith('/settings');

ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      {isSettingsRoute ? <SettingsApp /> : <App />}
    </QueryClientProvider>
  </React.StrictMode>,
);
