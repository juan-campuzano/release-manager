import { Link, useLocation } from 'react-router-dom';
import styles from './Breadcrumb.module.css';

interface BreadcrumbItem {
  label: string;
  path?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const location = useLocation();

  // Generate breadcrumbs from location if not provided
  const breadcrumbs = items || generateBreadcrumbs(location.pathname);

  if (breadcrumbs.length === 0) {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
      <ol className={styles.list}>
        {breadcrumbs.map((item, index) => {
          const isLast = index === breadcrumbs.length - 1;
          return (
            <li key={index} className={styles.item}>
              {!isLast && item.path ? (
                <>
                  <Link to={item.path} className={styles.link}>
                    {item.label}
                  </Link>
                  <span className={styles.separator} aria-hidden="true">
                    /
                  </span>
                </>
              ) : (
                <span className={styles.current} aria-current="page">
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const paths = pathname.split('/').filter(Boolean);
  const breadcrumbs: BreadcrumbItem[] = [{ label: 'Home', path: '/' }];

  if (paths.length === 0) {
    return [];
  }

  let currentPath = '';
  paths.forEach((path, index) => {
    currentPath += `/${path}`;
    const isLast = index === paths.length - 1;

    // Map paths to readable labels
    let label = path;
    if (path === 'history') {
      label = 'Release History';
    } else if (path === 'health') {
      label = 'Health Status';
    } else if (path === 'releases') {
      label = 'Releases';
    } else if (paths[index - 1] === 'releases') {
      label = `Release ${path}`;
    }

    breadcrumbs.push({
      label,
      path: isLast ? undefined : currentPath,
    });
  });

  return breadcrumbs;
}
