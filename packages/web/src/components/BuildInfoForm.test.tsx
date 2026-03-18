import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BuildInfoForm } from './BuildInfoForm';

// Mock the useNotification hook
jest.mock('../contexts/NotificationContext', () => ({
  useNotification: () => ({
    success: jest.fn(),
    error: jest.fn(),
  }),
}));

const defaultProps = {
  releaseId: 'release-1',
  latestBuild: 'build-100',
  latestPassingBuild: 'build-99',
  latestAppStoreBuild: 'build-98',
  onUpdate: jest.fn().mockResolvedValue(undefined),
};

describe('BuildInfoForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not show auto-fetch notice when hasCiPipeline is false', () => {
    render(<BuildInfoForm {...defaultProps} hasCiPipeline={false} />);

    expect(screen.queryByText(/auto-fetched from the CI pipeline/i)).not.toBeInTheDocument();
  });

  it('does not show auto-fetch notice when hasCiPipeline is not provided', () => {
    render(<BuildInfoForm {...defaultProps} />);

    expect(screen.queryByText(/auto-fetched from the CI pipeline/i)).not.toBeInTheDocument();
  });

  it('shows auto-fetch notice when hasCiPipeline is true', () => {
    render(<BuildInfoForm {...defaultProps} hasCiPipeline={true} />);

    expect(
      screen.getByText('Build information is being auto-fetched from the CI pipeline.')
    ).toBeInTheDocument();
  });

  it('keeps form fields visible and editable when hasCiPipeline is true', () => {
    render(<BuildInfoForm {...defaultProps} hasCiPipeline={true} />);

    const buildInput = screen.getByLabelText(/latest build/i);
    const passingInput = screen.getByLabelText(/latest passing build/i);
    const appStoreInput = screen.getByLabelText(/latest app store build/i);

    expect(buildInput).toBeInTheDocument();
    expect(buildInput).not.toBeDisabled();
    expect(passingInput).toBeInTheDocument();
    expect(passingInput).not.toBeDisabled();
    expect(appStoreInput).toBeInTheDocument();
    expect(appStoreInput).not.toBeDisabled();

    fireEvent.change(buildInput, { target: { value: 'build-200' } });
    expect(buildInput).toHaveValue('build-200');
  });

  it('allows form submission when hasCiPipeline is true', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined);
    render(<BuildInfoForm {...defaultProps} onUpdate={onUpdate} hasCiPipeline={true} />);

    const submitButton = screen.getByRole('button', { name: /save build info/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledTimes(1);
    });
  });

  it('renders the notice with role="status" for accessibility', () => {
    render(<BuildInfoForm {...defaultProps} hasCiPipeline={true} />);

    const notice = screen.getByRole('status');
    expect(notice).toHaveTextContent('Build information is being auto-fetched from the CI pipeline.');
  });
});
