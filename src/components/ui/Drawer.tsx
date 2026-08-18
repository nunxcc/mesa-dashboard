import clsx from 'clsx';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from './Button';
import styles from './Drawer.module.css';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Which edge it slides in from. */
  side?: 'left' | 'right';
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Built on the native `<dialog>` element rather than a portal-and-listeners
 * implementation.
 *
 * `showModal()` supplies focus trapping, Esc-to-close, `inert` on the rest of
 * the page and top-layer stacking that no z-index can lose a fight with - all
 * of which are the parts hand-rolled modals reliably get wrong.
 */
export function Drawer({
  open,
  onClose,
  title,
  side = 'right',
  children,
  footer,
  className,
}: DrawerProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    // showModal() throws if the dialog is already open, and close() on an
    // already-closed dialog fires a spurious `close` event.
    if (open && !dialog.open) dialog.showModal();
    else if (!open && dialog.open) dialog.close();
  }, [open]);

  // The dialog can close without React's knowledge - Esc, or the form method.
  // This keeps the caller's state honest when that happens.
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const handleClose = (): void => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={ref}
      className={clsx(styles['drawer'], styles[side], className)}
      aria-label={typeof title === 'string' ? title : undefined}
      // A click landing on the dialog itself rather than its contents is a
      // click on the backdrop, since the panel fills the element.
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className={styles['panel']}>
        <header className={styles['header']}>
          <h2 className={styles['title']}>{title}</h2>
          <Button variant="ghost" size="sm" iconOnly iconBefore="close" onClick={onClose}>
            Close
          </Button>
        </header>
        <div className={styles['body']}>{children}</div>
        {footer && <footer className={styles['footer']}>{footer}</footer>}
      </div>
    </dialog>
  );
}
