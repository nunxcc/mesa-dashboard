import { Button } from '@/components/ui/Button';
import { Logo } from '@/components/ui/Icon';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { DemoControls } from './DemoControls';
import styles from './Topbar.module.css';

interface TopbarProps {
  onOpenNav: () => void;
}

export function Topbar({ onOpenNav }: TopbarProps) {
  return (
    <header className={styles['topbar']}>
      <div className={styles['left']}>
        <Button
          variant="ghost"
          size="sm"
          iconOnly
          iconBefore="hamburger"
          className={styles['navToggle']}
          onClick={onOpenNav}
        >
          Open navigation
        </Button>

        {/* The sidebar carries the brand on desktop; on mobile it is hidden,
            so the topbar picks it up. */}
        <span className={styles['brand']}>
          <Logo size={18} />
          <span className={styles['wordmark']}>Mesa</span>
        </span>
      </div>

      <div className={styles['right']}>
        <DemoControls />
        <ThemeToggle />
      </div>
    </header>
  );
}
