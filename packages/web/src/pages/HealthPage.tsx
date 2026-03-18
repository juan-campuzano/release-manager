import { useState, useEffect } from 'react';
import { HealthStatus, DetailedHealthInfo } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { useAutoRefresh } from '../hooks/useAutoRefresh';
import { formatDate } from '../utils/formatters';
import styles from './HealthPage.module.css';

export function HealthPage() {
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [detailedInfo, setDetailedInfo] = useState<DetailedHealthInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastSuccessfulCheck, setLastSuccessfulCheck] = useState<string | null>(null);
  const { healthService } = useServices();

  const checkHealth = async () => {
    try {
      setError(null);
      const status = await healthService.checkHealth();
      setHealthStatus(status);
      if (status.status === 'healthy') {
        setLastSuccessfulCheck(status.timestamp);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to check health'));
      setHealthStatus({ status: 'unhealthy', timestamp: new Date().toISOString() });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchDetailedInfo = async () => {
    try {
      const info = await healthService.getDetailedHealth();
      setDetailedInfo(info);
    } catch (err) {
      // Detailed info is optional, don't show error
      console.error('Failed to fetch detailed health info:', err);
    }
  };

  useEffect(() => {
    checkHealth();
    fetchDetailedInfo();
  }, []);

  // Auto-refresh every 30 seconds
  useAutoRefresh(checkHealth, { interval: 30000, enabled: !isLoading });

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '< 1m';
  };

  const formatMemory = (bytes: number): string => {
    const mb = bytes / (1024 * 1024);
    const gb = mb / 1024;
    return gb >= 1 ? `${gb.toFixed(2)} GB` : `${mb.toFixed(2)} MB`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>API Server Health</h1>
        <button onClick={checkHealth} className={styles.refreshButton} disabled={isLoading}>
          {isLoading ? 'Checking...' : 'Check Now'}
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Checking server health...</div>}

      {!isLoading && healthStatus && (
        <div className={styles.statusCard}>
          <div className={styles.statusHeader}>
            <div className={`${styles.statusIndicator} ${styles[`status-${healthStatus.status}`]}`}>
              <span className={styles.statusDot} />
              <span className={styles.statusText}>
                {healthStatus.status === 'healthy' ? 'Healthy' : 'Unhealthy'}
              </span>
            </div>
            <span className={styles.timestamp}>
              {formatDate(healthStatus.timestamp)}
            </span>
          </div>

          {healthStatus.status === 'unhealthy' && lastSuccessfulCheck && (
            <div className={styles.lastSuccess}>
              Last successful check: {formatDate(lastSuccessfulCheck)}
            </div>
          )}

          {error && (
            <div className={styles.errorMessage}>
              <strong>Error:</strong> {error.message}
            </div>
          )}
        </div>
      )}

      {detailedInfo && (
        <div className={styles.detailsCard}>
          <h2 className={styles.detailsTitle}>Server Details</h2>
          
          <div className={styles.detailsGrid}>
            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Uptime:</span>
              <span className={styles.detailValue}>{formatUptime(detailedInfo.uptime)}</span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Memory Usage:</span>
              <span className={styles.detailValue}>
                {formatMemory(detailedInfo.memoryUsage.used)} / {formatMemory(detailedInfo.memoryUsage.total)}
              </span>
            </div>

            <div className={styles.detailItem}>
              <span className={styles.detailLabel}>Version:</span>
              <span className={styles.detailValue}>{detailedInfo.version}</span>
            </div>
          </div>
        </div>
      )}

      <div className={styles.autoRefreshNote}>
        Health status is automatically checked every 30 seconds
      </div>
    </div>
  );
}
