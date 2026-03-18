import { useState } from 'react';
import { ReleaseStage } from '../types';
import { useNotification } from '../contexts/NotificationContext';
import styles from './StageControl.module.css';

interface StageControlProps {
  releaseId: string;
  currentStage: ReleaseStage;
  onUpdate: (stage: ReleaseStage) => Promise<void>;
}

const STAGES: ReleaseStage[] = [
  'Release Branching',
  'Final Release Candidate',
  'Submit For App Store Review',
  'Roll Out 1%',
  'Roll Out 100%'
];

export function StageControl({ releaseId, currentStage, onUpdate }: StageControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedStage, setSelectedStage] = useState(currentStage);
  const { success, error } = useNotification();

  const handleStageChange = async (newStage: ReleaseStage) => {
    if (newStage === currentStage) return;

    const previousStage = selectedStage;
    setSelectedStage(newStage);
    setIsUpdating(true);

    try {
      await onUpdate(newStage);
      success(`Stage updated to "${newStage}"`, 3000);
    } catch (err) {
      setSelectedStage(previousStage);
      error(err instanceof Error ? err.message : 'Failed to update stage', null);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className={styles.container}>
      <label htmlFor={`stage-${releaseId}`} className={styles.label}>
        Release Stage
      </label>
      <select
        id={`stage-${releaseId}`}
        value={selectedStage}
        onChange={(e) => handleStageChange(e.target.value as ReleaseStage)}
        disabled={isUpdating}
        className={styles.select}
        aria-label="Select release stage"
        aria-describedby={isUpdating ? `stage-updating-${releaseId}` : undefined}
      >
        {STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {stage}
          </option>
        ))}
      </select>
      {isUpdating && (
        <span id={`stage-updating-${releaseId}`} className={styles.updating} role="status" aria-live="polite">
          Updating...
        </span>
      )}
    </div>
  );
}
