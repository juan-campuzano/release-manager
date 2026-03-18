import { Platform } from '../types';
import styles from './PlatformFilter.module.css';

interface PlatformFilterProps {
  selectedPlatform: Platform | null;
  onPlatformChange: (platform: Platform | null) => void;
}

/**
 * Platform filter component for filtering releases by platform
 * 
 * Requirements: 3.3
 */
export function PlatformFilter({ selectedPlatform, onPlatformChange }: PlatformFilterProps): JSX.Element {
  const platforms: Array<{ value: Platform | null; label: string }> = [
    { value: null, label: 'All' },
    { value: 'iOS', label: 'iOS' },
    { value: 'Android', label: 'Android' },
    { value: 'Desktop', label: 'Desktop' },
  ];

  return (
    <div className={styles.platformFilter}>
      {platforms.map(({ value, label }) => (
        <button
          key={label}
          type="button"
          className={`${styles.filterButton} ${selectedPlatform === value ? styles.active : ''}`}
          onClick={() => onPlatformChange(value)}
          aria-pressed={selectedPlatform === value}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
