import { renderHook, act, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { NotificationProvider, useNotification } from './NotificationContext';

/**
 * Test wrapper component
 */
function wrapper({ children }: { children: ReactNode }) {
  return <NotificationProvider>{children}</NotificationProvider>;
}

describe('NotificationContext', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('useNotification hook', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      expect(() => {
        renderHook(() => useNotification());
      }).toThrow('useNotification must be used within a NotificationProvider');

      consoleSpy.mockRestore();
    });

    it('should provide notification methods', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      expect(result.current).toHaveProperty('success');
      expect(result.current).toHaveProperty('error');
      expect(result.current).toHaveProperty('info');
      expect(result.current).toHaveProperty('warning');
      expect(result.current).toHaveProperty('dismiss');
      expect(result.current).toHaveProperty('notifications');
    });
  });

  describe('success notification', () => {
    it('should add success notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Operation successful');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'success',
        message: 'Operation successful',
        duration: 3000,
      });
      expect(result.current.notifications[0].id).toBeDefined();
    });

    it('should auto-dismiss after 3 seconds by default', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Operation successful');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
    });

    it('should auto-dismiss after custom duration', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Operation successful', 5000);
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(5000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
    });
  });

  describe('error notification', () => {
    it('should add error notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.error('Operation failed');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'error',
        message: 'Operation failed',
        duration: null,
      });
    });

    it('should not auto-dismiss by default', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.error('Operation failed');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(10000);
      });

      expect(result.current.notifications).toHaveLength(1);
    });

    it('should auto-dismiss when duration is provided', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.error('Operation failed', 3000);
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
    });
  });

  describe('info notification', () => {
    it('should add info notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.info('Information message');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'info',
        message: 'Information message',
        duration: 3000,
      });
    });

    it('should auto-dismiss after 3 seconds by default', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.info('Information message');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
    });
  });

  describe('warning notification', () => {
    it('should add warning notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.warning('Warning message');
      });

      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0]).toMatchObject({
        type: 'warning',
        message: 'Warning message',
        duration: 3000,
      });
    });

    it('should auto-dismiss after 3 seconds by default', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.warning('Warning message');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        jest.advanceTimersByTime(3000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(0);
      });
    });
  });

  describe('dismiss', () => {
    it('should manually dismiss notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.error('Error message');
      });

      expect(result.current.notifications).toHaveLength(1);
      const notificationId = result.current.notifications[0].id;

      act(() => {
        result.current.dismiss(notificationId);
      });

      expect(result.current.notifications).toHaveLength(0);
    });

    it('should handle dismissing non-existent notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Success message');
      });

      expect(result.current.notifications).toHaveLength(1);

      act(() => {
        result.current.dismiss('non-existent-id');
      });

      expect(result.current.notifications).toHaveLength(1);
    });
  });

  describe('multiple notifications', () => {
    it('should handle multiple notifications', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Success 1');
        result.current.error('Error 1');
        result.current.info('Info 1');
        result.current.warning('Warning 1');
      });

      expect(result.current.notifications).toHaveLength(4);
      expect(result.current.notifications[0].type).toBe('success');
      expect(result.current.notifications[1].type).toBe('error');
      expect(result.current.notifications[2].type).toBe('info');
      expect(result.current.notifications[3].type).toBe('warning');
    });

    it('should dismiss notifications independently', async () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Success 1', 1000);
        result.current.error('Error 1');
        result.current.info('Info 1', 2000);
      });

      expect(result.current.notifications).toHaveLength(3);

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(2);
      });

      act(() => {
        jest.advanceTimersByTime(1000);
      });

      await waitFor(() => {
        expect(result.current.notifications).toHaveLength(1);
        expect(result.current.notifications[0].type).toBe('error');
      });
    });
  });

  describe('notification ID generation', () => {
    it('should generate unique IDs for each notification', () => {
      const { result } = renderHook(() => useNotification(), { wrapper });

      act(() => {
        result.current.success('Message 1');
        result.current.success('Message 2');
        result.current.success('Message 3');
      });

      const ids = result.current.notifications.map(n => n.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(3);
    });
  });
});
