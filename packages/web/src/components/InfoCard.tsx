import styles from './InfoCard.module.css';

export interface InfoCardField {
  label: string;
  value: string | null;
  href?: string;
  fallback?: string;
}

export interface InfoCardProps {
  title: string;
  fields: InfoCardField[];
}

/**
 * Generic card component that renders a titled card with label-value field pairs.
 *
 * Requirements: 5.1–5.4, 6.1–6.3, 7.1–7.3, 8.1–8.4
 */
export function InfoCard({ title, fields }: InfoCardProps): JSX.Element {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>{title}</h3>
      <div className={styles.fields}>
        {fields.map((field) => {
          const displayValue = field.value ?? field.fallback ?? 'N/A';

          return (
            <div key={field.label} className={styles.field}>
              <span className={styles.label}>{field.label}</span>
              {field.href && field.value != null ? (
                <a
                  className={styles.link}
                  href={field.href}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {displayValue}
                </a>
              ) : (
                <span className={styles.value}>{displayValue}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
