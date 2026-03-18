import { ReactNode } from 'react';
import { Navigation } from './Navigation';
import styles from './Layout.module.css';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  return (
    <div className={styles.layout}>
      <Navigation />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
