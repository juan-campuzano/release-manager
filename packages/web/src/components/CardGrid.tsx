import type { ReactNode } from 'react';
import styles from './CardGrid.module.css';

export interface CardGridProps {
  children: ReactNode;
}

/**
 * Layout component that arranges children in a responsive CSS Grid.
 *
 * - >1024px: 4 columns
 * - 769px–1024px: 2 columns
 * - ≤768px: 1 column
 *
 * Requirements: 4.1, 4.2, 4.3
 */
export function CardGrid({ children }: CardGridProps): JSX.Element {
  return <div className={styles.grid}>{children}</div>;
}
