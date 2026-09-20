import {StrictMode} from 'react';
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
          <AppRouter />
          <OverrideReasonDialog />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
