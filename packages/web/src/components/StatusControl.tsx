import { useState } from 'react';
import { ReleaseStatus } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import styles from './StatusControl.module.css';

interface StatusControlProps {
  releaseId: string;
  currentStatus: ReleaseStatus;
  onUpdate: (status: ReleaseStatus) => Promise<void>;
}

const STATUSES: ReleaseStatus[] = ['Upcoming', 'Current', 'Production'];

export function StatusControl({ releaseId, currentStatus, onUpdate }: StatusControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(currentStatus);
  const { success, error } = useNotification();

  const handleStatusChange = async (newStatus: ReleaseStatus) => {
    if (newStatus === currentStatus) return;

    const previousStatus = selectedStatus;
    setSelectedStatus(newStatus);
    setIsUpdating(true);

    try {
      await onUpdate(newStatus);
      success(`Status updated to "${newStatus}"`, 3000);
    } catch (err) {
      setSelectedStatus(previousStatus);
      error(err instanceof Error ? err.message : 'Failed to update status', null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.container}>
      <label htmlFor={`status-${releaseId}`} className={styles.label}>
        Release Status
      </label>
      <select
        id={`status-${releaseId}`}
        value={selectedStatus}
        onChange={(e) => handleStatusChange(e.target.value as ReleaseStatus)}
        disabled={isUpdating}
        className={styles.select}
        aria-label="Select release status"
        aria-describedby={isUpdating ? `status-updating-${releaseId}` : undefined}
      >
        {STATUSES.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {isUpdating && (
        <span id={`status-updating-${releaseId}`} className={styles.updating} role="status" aria-live="polite">
          Updating...
        </span>
      )}
    </div>
  );
}
