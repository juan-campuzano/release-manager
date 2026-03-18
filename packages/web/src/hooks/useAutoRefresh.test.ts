import { renderHook } from '@testing-library/react';
import { useAutoRefresh } from './useAutoRefresh';

describe('useAutoRefresh', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should call callback at specified interval when enabled', () => {
    const callback = jest.fn();
    const interval = 1000;

    renderHook(() => useAutoRefresh(callback, { interval, enabled: true }));

    // Initially, callback should not be called
    expect(callback).not.toHaveBeenCalled();

    // After first interval
    jest.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(1);

    // After second interval
    jest.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(2);

    // After third interval
    jest.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('should not call callback when disabled', () => {
    const callback = jest.fn();
    const interval = 1000;

    renderHook(() => useAutoRefresh(callback, { interval, enabled: false }));

    jest.advanceTimersByTime(interval * 3);
    expect(callback).not.toHaveBeenCalled();
  });

  it('should stop calling callback when enabled changes to false', () => {
    const callback = jest.fn();
    const interval = 1000;

    const { rerender } = renderHook(
      ({ enabled }) => useAutoRefresh(callback, { interval, enabled }),
      { initialProps: { enabled: true } }
    );

    // First interval while enabled
    jest.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(1);

    // Disable auto-refresh
    rerender({ enabled: false });

    // Advance time - callback should not be called
    jest.advanceTimersByTime(interval * 2);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should start calling callback when enabled changes to true', () => {
    const callback = jest.fn();
    const interval = 1000;

    const { rerender } = renderHook(
      ({ enabled }) => useAutoRefresh(callback, { interval, enabled }),
      { initialProps: { enabled: false } }
    );

    // Advance time while disabled
    jest.advanceTimersByTime(interval * 2);
    expect(callback).not.toHaveBeenCalled();

    // Enable auto-refresh
    rerender({ enabled: true });

    // Advance time - callback should be called
    jest.advanceTimersByTime(interval);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it('should use updated callback on subsequent calls', () => {
    const callback1 = jest.fn();
    const callback2 = jest.fn();
    const interval = 1000;

    const { rerender } = renderHook(
      ({ callback }) => useAutoRefresh(callback, { interval, enabled: true }),
      { initialProps: { callback: callback1 } }
    );

    // First interval with callback1
    jest.advanceTimersByTime(interval);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).not.toHaveBeenCalled();

    // Update callback
    rerender({ callback: callback2 });

    // Second interval with callback2
    jest.advanceTimersByTime(interval);
    expect(callback1).toHaveBeenCalledTimes(1);
    expect(callback2).toHaveBeenCalledTimes(1);
  });

  it('should update interval when interval prop changes', () => {
    const callback = jest.fn();

    const { rerender } = renderHook(
      ({ interval }) => useAutoRefresh(callback, { interval, enabled: true }),
      { initialProps: { interval: 1000 } }
    );

    // First interval at 1000ms
    jest.advanceTimersByTime(1000);
    expect(callback).toHaveBeenCalledTimes(1);

    // Change interval to 500ms
    rerender({ interval: 500 });

    // Next call should happen at 500ms
    jest.advanceTimersByTime(500);
    expect(callback).toHaveBeenCalledTimes(2);
  });

  it('should clean up interval on unmount', () => {
    const callback = jest.fn();
    const interval = 1000;

    const { unmount } = renderHook(() =>
      useAutoRefresh(callback, { interval, enabled: true })
    );

    // Unmount before interval fires
    unmount();

    // Advance time - callback should not be called
    jest.advanceTimersByTime(interval * 2);
    expect(callback).not.toHaveBeenCalled();
  });
});
