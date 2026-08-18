import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router';
import { ErrorBoundary } from '@/app/ErrorBoundary';
import { Drawer } from '@/components/ui/Drawer';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import styles from './AppShell.module.css';

export function AppShell() {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();

  // A route change must close the drawer, including one triggered by the
  // browser's back button rather than by tapping a link.
  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  return (
    <div className={styles['shell']}>
      {/*
        First thing in the tab order, visible only once focused. Without it a
        keyboard user re-traverses four nav links on every page.
      */}
      <a href="#main" className={styles['skipLink']}>
        Skip to content
      </a>

      <aside className={styles['aside']}>
        <Sidebar />
      </aside>

      <Drawer
        open={navOpen}
        onClose={() => setNavOpen(false)}
        title="Mesa"
        side="left"
        className={styles['navDrawer']}
      >
        <Sidebar variant="drawer" onNavigate={() => setNavOpen(false)} />
      </Drawer>

      <div className={styles['column']}>
        <Topbar onOpenNav={() => setNavOpen(true)} />
        <main id="main" className={styles['main']} tabIndex={-1}>
          <div className={styles['content']}>
            {/*
              Keyed by route so a crash on one page is left behind when the
              user navigates away, instead of stranding them on an error
              screen. The shell around it survives the remount.
            */}
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>
      </div>
    </div>
  );
}
