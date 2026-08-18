import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

export interface PageHeaderProps {
  title: string;
  /** One line on what this page is for. Every page has one. */
  description: string;
  /** Filters and page-level controls, right-aligned on wide screens. */
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className={styles['header']}>
      <div className={styles['headings']}>
        <h1 className={styles['title']}>{title}</h1>
        <p className={styles['description']}>{description}</p>
      </div>
      {actions && <div className={styles['actions']}>{actions}</div>}
    </div>
  );
}
