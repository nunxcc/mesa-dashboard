import { BrowserRouter, Route, Routes } from 'react-router';
import { AppShell } from '@/components/layout/AppShell';
import { ChannelsPage } from '@/pages/ChannelsPage';
import { MenuPage } from '@/pages/MenuPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OverviewPage } from '@/pages/OverviewPage';
import { NotFound } from './ErrorBoundary';
import { Providers } from './providers';

/**
 * The error boundary lives inside `AppShell`, wrapping the outlet rather than
 * the router. Placing it here would mean keying it on the pathname to recover
 * after a crash, which remounts the entire shell - sidebar, topbar and all -
 * on every navigation.
 */
export function App() {
  return (
    <Providers>
      <BrowserRouter>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<OverviewPage />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="menu" element={<MenuPage />} />
            <Route path="channels" element={<ChannelsPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Providers>
  );
}
