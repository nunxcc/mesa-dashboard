import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';
import styles from './Card.module.css';

export interface CardProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
  /** Removes the body padding, for cards whose child is a full-bleed table. */
  flush?: boolean;
}

export function Card({ children, flush = false, className, ...props }: CardProps) {
  return (
    <section className={clsx(styles['card'], flush && styles['flush'], className)} {...props}>
      {children}
    </section>
  );
}

export interface CardHeaderProps {
  title: ReactNode;
  /** Sits under the title. Use it for the definition, not for decoration. */
  description?: ReactNode;
  /** Buttons, selects, legends — anything aligned to the right of the title. */
  actions?: ReactNode;
  /**
   * Heading level. The overview page is a single h1 with h2 cards; a card
   * dropped inside a section needs h3 to keep the outline honest.
   */
  as?: 'h2' | 'h3';
  id?: string;
}

export function CardHeader({ title, description, actions, as: Tag = 'h2', id }: CardHeaderProps) {
  return (
    <header className={styles['header']}>
      <div className={styles['headings']}>
        <Tag className={styles['title']} id={id}>
          {title}
        </Tag>
        {description && <p className={styles['description']}>{description}</p>}
      </div>
      {actions && <div className={styles['actions']}>{actions}</div>}
    </header>
  );
}

export function CardBody({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(styles['body'], className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx(styles['footer'], className)} {...props}>
      {children}
    </div>
  );
}
