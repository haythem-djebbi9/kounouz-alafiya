import {StrictMode, Suspense} from 'react';
import {createRoot} from 'react-dom/client';
import {BrowserRouter} from 'react-router-dom';
import {QueryClientProvider} from '@tanstack/react-query';
import {AppRouter} from './AppRouter';
import {AuthProvider} from './lib/auth-context';
import {OverrideReasonDialog} from './components/OverrideReasonDialog';
import {queryClient} from './lib/query-client';
import './i18n';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          {/* Le temps de charger les textes de la langue active (quelques Ko). */}
          <Suspense fallback={<div className="min-h-screen bg-[#FAF6EE]" />}>
            <AppRouter />
            <OverrideReasonDialog />
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
