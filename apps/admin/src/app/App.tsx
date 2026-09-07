import { BrowserRouter } from 'react-router';
import { ROUTER_BASENAME } from '@/config/app-config';
import { AppProviders } from './AppProviders';
import { AppRoutes } from './routes';

export function App() {
  return (
    <BrowserRouter basename={ROUTER_BASENAME}>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
}
