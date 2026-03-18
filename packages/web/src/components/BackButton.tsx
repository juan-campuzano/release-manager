import { useNavigate } from 'react-router-dom';
import styles from './BackButton.module.css';

interface BackButtonProps {
  to?: string;
  label?: string;
}

export function BackButton({ to, label = 'Back' }: BackButtonProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1);
    }
  };

  return (
    <button className={styles.backButton} onClick={handleClick} aria-label={label}>
      <span className={styles.arrow}>←</span>
      <span>{label}</span>
    </button>
  );
}
