import { DAUStats } from '../types';
import { formatDAUCount, formatDate } from '../utils/formatters';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import styles from './DAUChart.module.css';

interface DAUChartProps {
  stats: DAUStats;
}

export function DAUChart({ stats }: DAUChartProps) {
  const getTrendIcon = () => {
    switch (stats.trend) {
      case 'increasing':
        return '↑';
      case 'decreasing':
        return '↓';
      default:
        return '→';
    }
  };

  const getTrendClass = () => {
    switch (stats.trend) {
      case 'increasing':
        return styles.trendIncreasing;
      case 'decreasing':
        return styles.trendDecreasing;
      default:
        return styles.trendStable;
    }
  };

  // Format data for recharts
  const chartData = stats.history.map(point => ({
    date: new Date(point.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    count: point.count
  }));

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Daily Active Users</h3>
      
      <div className={styles.currentDAU}>
        <div className={styles.dauValue}>
          {formatDAUCount(stats.currentDAU)}
        </div>
        <div className={`${styles.trend} ${getTrendClass()}`}>
          <span className={styles.trendIcon}>{getTrendIcon()}</span>
          <span className={styles.trendLabel}>{stats.trend}</span>
        </div>
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis 
              dataKey="date" 
              stroke="#666"
              style={{ fontSize: '0.75rem' }}
            />
            <YAxis 
              stroke="#666"
              style={{ fontSize: '0.75rem' }}
              tickFormatter={(value) => formatDAUCount(value)}
            />
            <Tooltip 
              formatter={(value: number) => [formatDAUCount(value), 'DAU']}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e0e0e0',
                borderRadius: '0.25rem',
                fontSize: '0.875rem'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="count" 
              stroke="#1976d2" 
              strokeWidth={2}
              dot={{ fill: '#1976d2', r: 4 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className={styles.timestamp}>
        Last collected: {formatDate(stats.collectedAt)}
      </div>
    </div>
  );
}
