import { NavLink } from 'react-router';
import { Icon, Logo } from '@/components/ui/Icon';
import { NAV_ITEMS, RESTAURANT } from './navigation';
import styles from './Sidebar.module.css';

interface SidebarProps {
  /** Set when rendered inside the mobile drawer: hides the brand block,
   *  which the drawer header already shows, and closes on navigation. */
  variant?: 'fixed' | 'drawer';
  onNavigate?: () => void;
}

export function Sidebar({ variant = 'fixed', onNavigate }: SidebarProps) {
  return (
    <div className={variant === 'drawer' ? styles['drawer'] : styles['sidebar']}>
      {variant === 'fixed' && (
        <div className={styles['brand']}>
          <span className={styles['mark']} aria-hidden="true">
            <Logo size={20} />
          </span>
          <span className={styles['brandText']}>
            <span className={styles['wordmark']}>Mesa</span>
            <span className={styles['venue']}>{RESTAURANT.name}</span>
          </span>
        </div>
      )}

      <nav aria-label="Main">
        <ul className={styles['navList']} role="list">
          {NAV_ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                // Without `end`, "/" would match every route and the Overview
                // link would stay highlighted on every page.
                end={item.to === '/'}
                className={({ isActive }) =>
                  isActive ? `${styles['navLink']} ${styles['active']}` : styles['navLink']
                }
                onClick={onNavigate}
              >
                <Icon name={item.icon} size={17} />
                <span className={styles['navLabel']}>
                  {item.label}
                  {variant === 'drawer' && (
                    <span className={styles['navDescription']}>{item.description}</span>
                  )}
                </span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className={styles['footer']}>
        <p className={styles['footerVenue']}>{RESTAURANT.name}</p>
        <p className={styles['footerMeta']}>{RESTAURANT.location}</p>
      </div>
    </div>
  );
}
