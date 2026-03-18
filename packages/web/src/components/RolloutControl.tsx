import { useState, useEffect } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import styles from './RolloutControl.module.css';

interface RolloutControlProps {
  releaseId: string;
  currentPercentage: number;
  onUpdate: (percentage: number) => Promise<void>;
}

export function RolloutControl({ releaseId, currentPercentage, onUpdate }: RolloutControlProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [percentage, setPercentage] = useState(currentPercentage);
  const [inputValue, setInputValue] = useState(currentPercentage.toString());
  const { success, error } = useNotification();

  useEffect(() => {
    setPercentage(currentPercentage);
    setInputValue(currentPercentage.toString());
  }, [currentPercentage]);

  const validatePercentage = (value: number): boolean => {
    return value >= 0 && value <= 100 && !isNaN(value);
  };

  const handleUpdate = async (newPercentage: number) => {
    if (newPercentage === currentPercentage) return;

    if (!validatePercentage(newPercentage)) {
      error('Rollout percentage must be between 0 and 100', 3000);
      setPercentage(currentPercentage);
      setInputValue(currentPercentage.toString());
      return;
    }

    setIsUpdating(true);

    try {
      await onUpdate(newPercentage);
      success(`Rollout percentage updated to ${newPercentage}%`, 3000);
    } catch (err) {
      setPercentage(currentPercentage);
      setInputValue(currentPercentage.toString());
      error(err instanceof Error ? err.message : 'Failed to update rollout percentage', null);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSliderChange = (value: number) => {
    setPercentage(value);
    setInputValue(value.toString());
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue)) {
      setPercentage(numValue);
    }
  };

  const handleInputBlur = () => {
    const numValue = parseFloat(inputValue);
    if (isNaN(numValue) || !validatePercentage(numValue)) {
      setInputValue(currentPercentage.toString());
      setPercentage(currentPercentage);
    } else {
      handleUpdate(numValue);
    }
  };

  const handleSliderRelease = () => {
    handleUpdate(percentage);
  };

  return (
    <div className={styles.container}>
      <label htmlFor={`rollout-${releaseId}`} className={styles.label}>
        Rollout Percentage
      </label>
      
      <div className={styles.controls}>
        <input
          type="range"
          id={`rollout-${releaseId}`}
          min="0"
          max="100"
          step="1"
          value={percentage}
          onChange={(e) => handleSliderChange(parseFloat(e.target.value))}
          onMouseUp={handleSliderRelease}
          onTouchEnd={handleSliderRelease}
          disabled={isUpdating}
          className={styles.slider}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percentage}
          aria-valuetext={`${percentage} percent`}
        />
        
        <div className={styles.inputGroup}>
          <input
            type="number"
            min="0"
            max="100"
            step="1"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            onBlur={handleInputBlur}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleInputBlur();
              }
            }}
            disabled={isUpdating}
            className={styles.input}
            aria-label="Rollout percentage value"
          />
          <span className={styles.unit} aria-hidden="true">%</span>
        </div>
      </div>

      <div className={styles.progressBar}>
        <div 
          className={styles.progressFill} 
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Rollout progress"
        />
      </div>

      {isUpdating && (
        <span className={styles.updating} role="status" aria-live="polite">
          Updating...
        </span>
      )}
    </div>
  );
}
