import { QualityMetrics as QualityMetricsType, QualityThresholds } from '../types';
import { formatPercentage, formatDate } from '../utils/formatters';
import styles from './QualityMetrics.module.css';

interface QualityMetricsProps {
  metrics: QualityMetricsType;
  thresholds: QualityThresholds;
}

export function QualityMetrics({ metrics, thresholds }: QualityMetricsProps) {
  const isCrashRateExceeded = metrics.crashRate > thresholds.crashRateThreshold;
  const isCpuExceptionRateExceeded = metrics.cpuExceptionRate > thresholds.cpuExceptionRateThreshold;

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Quality Metrics</h3>
      
      <div className={styles.metrics}>
        <div className={`${styles.metric} ${isCrashRateExceeded ? styles.exceeded : ''}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>Crash Rate</span>
            {isCrashRateExceeded && <span className={styles.warning}>⚠️ Exceeds Threshold</span>}
          </div>
          <div className={styles.metricValue}>
            {formatPercentage(metrics.crashRate)}
          </div>
          <div className={styles.threshold}>
            Threshold: {formatPercentage(thresholds.crashRateThreshold)}
          </div>
        </div>

        <div className={`${styles.metric} ${isCpuExceptionRateExceeded ? styles.exceeded : ''}`}>
          <div className={styles.metricHeader}>
            <span className={styles.metricLabel}>CPU Exception Rate</span>
            {isCpuExceptionRateExceeded && <span className={styles.warning}>⚠️ Exceeds Threshold</span>}
          </div>
          <div className={styles.metricValue}>
            {formatPercentage(metrics.cpuExceptionRate)}
          </div>
          <div className={styles.threshold}>
            Threshold: {formatPercentage(thresholds.cpuExceptionRateThreshold)}
          </div>
        </div>
      </div>

      <div className={styles.timestamp}>
        Last collected: {formatDate(metrics.collectedAt)}
      </div>
    </div>
  );
}
