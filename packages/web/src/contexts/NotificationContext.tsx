import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

/**
 * Notification types
 */
export type NotificationType = 'success' | 'error' | 'info' | 'warning';

/**
 * Notification object
 */
export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  duration: number | null; // null for persistent (manual dismiss)
}

/**
 * Notification state
 */
interface NotificationState {
  notifications: Notification[];
}

/**
 * Notification actions
 */
type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'REMOVE_NOTIFICATION'; payload: string };

/**
 * Notification context value
 */
export interface NotificationContextValue {
  notifications: Notification[];
  success: (message: string, duration?: number) => void;
  error: (message: string, duration?: number | null) => void;
  info: (message: string, duration?: number) => void;
  warning: (message: string, duration?: number) => void;
  dismiss: (id: string) => void;
}

/**
 * Notification context
 */
const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

/**
 * Props for NotificationProvider
 */
interface NotificationProviderProps {
  children: ReactNode;
}

/**
 * Notification reducer
 * Manages notification state with add and remove actions
 */
function notificationReducer(
  state: NotificationState,
  action: NotificationAction
): NotificationState {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [...state.notifications, action.payload],
      };
    case 'REMOVE_NOTIFICATION':
      return {
        ...state,
        notifications: state.notifications.filter(n => n.id !== action.payload),
      };
    default:
      return state;
  }
}

/**
 * Generate unique notification ID
 */
function generateId(): string {
  return `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Notification Provider component
 * 
 * Manages notification state and provides methods to show notifications:
 * - success: Auto-dismiss after 3 seconds (default)
 * - error: Manual dismiss (persistent by default)
 * - info: Auto-dismiss after 3 seconds (default)
 * - warning: Auto-dismiss after 3 seconds (default)
 * 
 * Requirements: 16.3, 16.4
 */
export function NotificationProvider({ children }: NotificationProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(notificationReducer, {
    notifications: [],
  });

  /**
   * Add a notification
   */
  const addNotification = useCallback((
    type: NotificationType,
    message: string,
    duration: number | null
  ) => {
    const id = generateId();
    const notification: Notification = {
      id,
      type,
      message,
      duration,
    };

    dispatch({ type: 'ADD_NOTIFICATION', payload: notification });

    // Auto-dismiss if duration is set
    if (duration !== null) {
      setTimeout(() => {
        dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
      }, duration);
    }
  }, []);

  /**
   * Show success notification
   * Auto-dismisses after 3 seconds by default
   * 
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 3000)
   */
  const success = useCallback((message: string, duration: number = 3000) => {
    addNotification('success', message, duration);
  }, [addNotification]);

  /**
   * Show error notification
   * Requires manual dismiss by default
   * 
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: null for manual dismiss)
   */
  const error = useCallback((message: string, duration: number | null = null) => {
    addNotification('error', message, duration);
  }, [addNotification]);

  /**
   * Show info notification
   * Auto-dismisses after 3 seconds by default
   * 
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 3000)
   */
  const info = useCallback((message: string, duration: number = 3000) => {
    addNotification('info', message, duration);
  }, [addNotification]);

  /**
   * Show warning notification
   * Auto-dismisses after 3 seconds by default
   * 
   * @param message - Notification message
   * @param duration - Duration in milliseconds (default: 3000)
   */
  const warning = useCallback((message: string, duration: number = 3000) => {
    addNotification('warning', message, duration);
  }, [addNotification]);

  /**
   * Dismiss a notification manually
   * 
   * @param id - Notification ID
   */
  const dismiss = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', payload: id });
  }, []);

  const contextValue: NotificationContextValue = {
    notifications: state.notifications,
    success,
    error,
    info,
    warning,
    dismiss,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}

/**
 * Hook to access notification context
 * 
 * @returns Notification context value
 * @throws Error if used outside NotificationProvider
 */
export function useNotification(): NotificationContextValue {
  const context = useContext(NotificationContext);
  
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  
  return context;
}
