import { useState, useEffect } from 'react';
import { Release, Platform, ReleaseStatus, HistoryFilters as HistoryFiltersType } from '../types';
import { useServices } from '../contexts/ServicesContext';
import { formatDate } from '../utils/formatters';
import styles from './HistoryPage.module.css';

export function HistoryPage() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [filters, setFilters] = useState<HistoryFiltersType>({});
  const { releaseService } = useServices();

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await releaseService.getReleaseHistory(filters);
      setReleases(data);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch release history'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [filters]);

  const handleFilterChange = (newFilters: Partial<HistoryFiltersType>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({});
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Release History</h1>
        <button onClick={fetchHistory} className={styles.refreshButton} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className={styles.filters}>
        <div className={styles.filterGroup}>
          <label htmlFor="platform" className={styles.filterLabel}>Platform:</label>
          <select
            id="platform"
            value={filters.platform || ''}
            onChange={(e) => handleFilterChange({ platform: e.target.value as Platform || undefined })}
            className={styles.filterSelect}
          >
            <option value="">All Platforms</option>
            <option value="iOS">iOS</option>
            <option value="Android">Android</option>
            <option value="Desktop">Desktop</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="status" className={styles.filterLabel}>Status:</label>
          <select
            id="status"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange({ status: e.target.value as ReleaseStatus || undefined })}
            className={styles.filterSelect}
          >
            <option value="">All Statuses</option>
            <option value="Upcoming">Upcoming</option>
            <option value="Current">Current</option>
            <option value="Production">Production</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="startDate" className={styles.filterLabel}>Start Date:</label>
          <input
            id="startDate"
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => handleFilterChange({ startDate: e.target.value || undefined })}
            className={styles.filterInput}
          />
        </div>

        <div className={styles.filterGroup}>
          <label htmlFor="endDate" className={styles.filterLabel}>End Date:</label>
          <input
            id="endDate"
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => handleFilterChange({ endDate: e.target.value || undefined })}
            className={styles.filterInput}
          />
        </div>

        <button onClick={clearFilters} className={styles.clearButton}>
          Clear Filters
        </button>
      </div>

      {isLoading && <div className={styles.loading}>Loading release history...</div>}

      {error && (
        <div className={styles.error}>
          <p>Error loading history: {error.message}</p>
          <button onClick={fetchHistory} className={styles.retryButton}>
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && releases.length === 0 && (
        <div className={styles.empty}>No releases found matching the filters</div>
      )}

      {!isLoading && !error && releases.length > 0 && (
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Platform</th>
                <th>Version</th>
                <th>Status</th>
                <th>Stage</th>
                <th>Created</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {releases.map((release) => (
                <tr key={release.id}>
                  <td>{release.platform}</td>
                  <td>{release.version}</td>
                  <td>
                    <span className={`${styles.statusBadge} ${styles[`status-${release.status.toLowerCase()}`]}`}>
                      {release.status}
                    </span>
                  </td>
                  <td>{release.currentStage}</td>
                  <td>{formatDate(release.createdAt)}</td>
                  <td>{formatDate(release.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
