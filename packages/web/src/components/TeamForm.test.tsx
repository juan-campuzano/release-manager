import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TeamForm } from './TeamForm';

describe('TeamForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    mockOnSubmit.mockResolvedValue(undefined);
  });

  it('renders input and submit button', () => {
    render(<TeamForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText('Team name')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create team/i })).toBeInTheDocument();
  });

  it('shows validation error for empty name', async () => {
    render(<TeamForm onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Team name is required');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows validation error for whitespace-only name', async () => {
    render(<TeamForm onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Team name is required');
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with trimmed name and clears input on success', async () => {
    render(<TeamForm onSubmit={mockOnSubmit} />);
    const input = screen.getByLabelText('Team name');

    fireEvent.change(input, { target: { value: '  Alpha Team  ' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Alpha Team');
    });
    expect(input).toHaveValue('');
  });

  it('displays API error from onSubmit rejection', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Team name already taken'));
    render(<TeamForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Existing Team' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Team name already taken');
  });

  it('displays generic error for non-Error rejections', async () => {
    mockOnSubmit.mockRejectedValue('something went wrong');
    render(<TeamForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Failed to create team');
  });

  it('disables submit button while submitting', async () => {
    let resolveSubmit: () => void;
    mockOnSubmit.mockImplementation(() => new Promise<void>((resolve) => { resolveSubmit = resolve; }));

    render(<TeamForm onSubmit={mockOnSubmit} />);
    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'Test' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeDisabled();
      expect(screen.getByRole('button')).toHaveTextContent('Creating...');
    });

    resolveSubmit!();

    await waitFor(() => {
      expect(screen.getByRole('button')).not.toBeDisabled();
      expect(screen.getByRole('button')).toHaveTextContent('Create Team');
    });
  });

  it('does not retain input value after failed submission', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Conflict'));
    render(<TeamForm onSubmit={mockOnSubmit} />);

    fireEvent.change(screen.getByLabelText('Team name'), { target: { value: 'My Team' } });
    fireEvent.click(screen.getByRole('button', { name: /create team/i }));

    await screen.findByRole('alert');
    // Input should still have the value so user can retry
    expect(screen.getByLabelText('Team name')).toHaveValue('My Team');
  });
});
