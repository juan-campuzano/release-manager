import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { NotificationProvider } from '../contexts';
import { NotificationContainer } from './NotificationContainer';
import { useNotification } from '../contexts';

/**
 * Test component that uses notification context
 */
function TestComponent() {
  const { success, error, info, warning } = useNotification();

  return (
    <div>
      <button onClick={() => success('Success message')}>Show Success</button>
      <button onClick={() => error('Error message')}>Show Error</button>
      <button onClick={() => info('Info message')}>Show Info</button>
      <button onClick={() => warning('Warning message')}>Show Warning</button>
    </div>
  );
}

/**
 * Test wrapper with provider
 */
function TestWrapper() {
  return (
    <NotificationProvider>
      <TestComponent />
      <NotificationContainer />
    </NotificationProvider>
  );
}

describe('NotificationContainer', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should render without notifications', () => {
    const { container } = render(
      <NotificationProvider>
        <NotificationContainer />
      </NotificationProvider>
    );

    const notificationContainer = container.querySelector('[aria-live="polite"]');
    expect(notificationContainer).toBeInTheDocument();
    expect(notificationContainer).toHaveAttribute('aria-atomic', 'true');
  });

  it('should display success notification', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('should display error notification', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should display info notification', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should display warning notification', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Warning'));

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('should display multiple notifications', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));

    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(3);
    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('should dismiss notification when dismiss button is clicked', async () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();

    const dismissButton = screen.getByLabelText('Dismiss notification');
    fireEvent.click(dismissButton);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should auto-dismiss success notification after 3 seconds', async () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Success'));

    expect(screen.getByText('Success message')).toBeInTheDocument();

    jest.advanceTimersByTime(3000);

    await waitFor(() => {
      expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    });
  });

  it('should not auto-dismiss error notification', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Error message')).toBeInTheDocument();

    jest.advanceTimersByTime(10000);

    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('should have ARIA live region', () => {
    const { container } = render(
      <NotificationProvider>
        <NotificationContainer />
      </NotificationProvider>
    );

    const notificationContainer = container.querySelector('[aria-live="polite"]');
    expect(notificationContainer).toHaveAttribute('aria-live', 'polite');
    expect(notificationContainer).toHaveAttribute('aria-atomic', 'true');
  });

  it('should have accessible dismiss button', () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Success'));

    const dismissButton = screen.getByLabelText('Dismiss notification');
    expect(dismissButton).toBeInTheDocument();
    expect(dismissButton).toHaveAttribute('type', 'button');
  });

  it('should dismiss specific notification when multiple exist', async () => {
    render(<TestWrapper />);

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));
    fireEvent.click(screen.getByText('Show Info'));

    expect(screen.getAllByRole('alert')).toHaveLength(3);

    const dismissButtons = screen.getAllByLabelText('Dismiss notification');
    fireEvent.click(dismissButtons[1]); // Dismiss error notification

    await waitFor(() => {
      expect(screen.getAllByRole('alert')).toHaveLength(2);
      expect(screen.queryByText('Error message')).not.toBeInTheDocument();
      expect(screen.getByText('Success message')).toBeInTheDocument();
      expect(screen.getByText('Info message')).toBeInTheDocument();
    });
  });
});
