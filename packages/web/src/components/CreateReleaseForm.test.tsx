import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CreateReleaseForm } from './CreateReleaseForm';
import { ReleaseConfig, RepositoryConfig } from '../types';

// Mock the useServices hook
const mockGetAll = jest.fn().mockResolvedValue([]);
jest.mock('../contexts/ServicesContext', () => ({
  useServices: () => ({
    configService: {
      getAll: mockGetAll,
    },
  }),
}));

describe('CreateReleaseForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
    mockGetAll.mockClear();
    mockGetAll.mockResolvedValue([]);
  });

  it('renders all form fields', () => {
    render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    expect(screen.getByLabelText(/platform/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/version/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/branch name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/repository url/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/source type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/required squads/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/crash rate threshold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cpu exception rate threshold/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/rollout stages/i)).toBeInTheDocument();
  });

  it('submits valid form data', async () => {
    mockOnSubmit.mockResolvedValue(undefined);

    render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    // Fill in form fields
    fireEvent.change(screen.getByLabelText(/platform/i), { target: { value: 'iOS' } });
    fireEvent.change(screen.getByLabelText(/version/i), { target: { value: '1.2.3' } });
    fireEvent.change(screen.getByLabelText(/branch name/i), { target: { value: 'release/1.2.3' } });
    fireEvent.change(screen.getByLabelText(/repository url/i), { target: { value: 'https://github.com/org/repo' } });
    fireEvent.change(screen.getByLabelText(/source type/i), { target: { value: 'github' } });
    fireEvent.change(screen.getByLabelText(/required squads/i), { target: { value: 'Squad A, Squad B' } });
    fireEvent.change(screen.getByLabelText(/crash rate threshold/i), { target: { value: '5' } });
    fireEvent.change(screen.getByLabelText(/cpu exception rate threshold/i), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText(/rollout stages/i), { target: { value: '1, 10, 50, 100' } });

    const submitButton = screen.getByRole('button', { name: /create release/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledTimes(1);
    });

    const expectedConfig: ReleaseConfig = {
      platform: 'iOS',
      version: '1.2.3',
      branchName: 'release/1.2.3',
      repositoryUrl: 'https://github.com/org/repo',
      sourceType: 'github',
      requiredSquads: ['Squad A', 'Squad B'],
      qualityThresholds: {
        crashRateThreshold: 5,
        cpuExceptionRateThreshold: 3,
      },
      rolloutStages: [1, 10, 50, 100],
    };

    expect(mockOnSubmit).toHaveBeenCalledWith(expectedConfig);
  });

  it('disables form fields when submitting', () => {
    render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={true} />);

    expect(screen.getByLabelText(/platform/i)).toBeDisabled();
    expect(screen.getByLabelText(/version/i)).toBeDisabled();
    expect(screen.getByLabelText(/branch name/i)).toBeDisabled();
    
    const submitButton = screen.getByRole('button', { name: /create release/i });
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent(/creating/i);
  });

  it('displays required field indicators', () => {
    render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    const requiredIndicators = screen.getAllByText('*');
    expect(requiredIndicators.length).toBeGreaterThan(0);
  });

  it('has proper form structure and accessibility', () => {
    render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

    // Check form exists
    const form = screen.getByRole('button', { name: /create release/i }).closest('form');
    expect(form).toBeInTheDocument();

    // Check all inputs have proper labels
    expect(screen.getByLabelText(/platform/i)).toHaveAttribute('id', 'platform');
    expect(screen.getByLabelText(/version/i)).toHaveAttribute('id', 'version');
    expect(screen.getByLabelText(/branch name/i)).toHaveAttribute('id', 'branchName');
    expect(screen.getByLabelText(/repository url/i)).toHaveAttribute('id', 'repositoryUrl');
  });

  describe('config integration', () => {
    const mockConfigs: RepositoryConfig[] = [
      {
        id: 'config-1',
        name: 'My App Config',
        repositoryUrl: 'https://github.com/org/my-app',
        sourceType: 'github',
        requiredSquads: ['Alpha', 'Beta'],
        qualityThresholds: { crashRateThreshold: 2, cpuExceptionRateThreshold: 3 },
        rolloutStages: [1, 5, 25, 100],
        ciPipelineId: 'ci-123',
        analyticsProjectId: 'analytics-456',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
      {
        id: 'config-2',
        name: 'Azure Repo Config',
        repositoryUrl: 'https://dev.azure.com/org/repo',
        sourceType: 'azure',
        requiredSquads: ['Core'],
        qualityThresholds: { crashRateThreshold: 10, cpuExceptionRateThreshold: 8 },
        rolloutStages: [10, 50, 100],
        createdAt: '2024-01-02T00:00:00Z',
        updatedAt: '2024-01-02T00:00:00Z',
      },
    ];

    it('renders dropdown with config names after fetching', async () => {
      mockGetAll.mockResolvedValue(mockConfigs);

      render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

      await waitFor(() => {
        const dropdown = screen.getByLabelText(/repository configuration/i) as HTMLSelectElement;
        expect(dropdown).toBeInTheDocument();

        const options = Array.from(dropdown.options).map(o => o.text);
        expect(options).toContain('None (manual entry)');
        expect(options).toContain('My App Config');
        expect(options).toContain('Azure Repo Config');
      });
    });

    it('populates fields when a config is selected', async () => {
      mockGetAll.mockResolvedValue(mockConfigs);

      render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

      await waitFor(() => {
        expect(screen.getByLabelText(/repository configuration/i)).toBeInTheDocument();
        expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
      });

      const dropdown = screen.getByLabelText(/repository configuration/i);
      fireEvent.change(dropdown, { target: { value: 'config-1' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/repository url/i)).toHaveValue('https://github.com/org/my-app');
        expect(screen.getByLabelText(/source type/i)).toHaveValue('github');
        expect(screen.getByLabelText(/required squads/i)).toHaveValue('Alpha, Beta');
        expect(screen.getByLabelText(/crash rate threshold/i)).toHaveValue(2);
        expect(screen.getByLabelText(/cpu exception rate threshold/i)).toHaveValue(3);
        expect(screen.getByLabelText(/rollout stages/i)).toHaveValue('1, 5, 25, 100');
        expect(screen.getByLabelText(/ci pipeline id/i)).toHaveValue('ci-123');
        expect(screen.getByLabelText(/analytics project id/i)).toHaveValue('analytics-456');
      });
    });

    it('resets fields when "None" is selected after a config', async () => {
      mockGetAll.mockResolvedValue(mockConfigs);

      render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

      await waitFor(() => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
      });

      const dropdown = screen.getByLabelText(/repository configuration/i);

      // First select a config
      fireEvent.change(dropdown, { target: { value: 'config-1' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/repository url/i)).toHaveValue('https://github.com/org/my-app');
      });

      // Then select "None"
      fireEvent.change(dropdown, { target: { value: '' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/repository url/i)).toHaveValue('');
        expect(screen.getByLabelText(/source type/i)).toHaveValue('github');
        expect(screen.getByLabelText(/required squads/i)).toHaveValue('');
        expect(screen.getByLabelText(/crash rate threshold/i)).toHaveValue(5);
        expect(screen.getByLabelText(/cpu exception rate threshold/i)).toHaveValue(5);
        expect(screen.getByLabelText(/rollout stages/i)).toHaveValue('1,10,50,100');
      });
    });

    it('allows editing fields after auto-population', async () => {
      mockGetAll.mockResolvedValue(mockConfigs);

      render(<CreateReleaseForm onSubmit={mockOnSubmit} isSubmitting={false} />);

      await waitFor(() => {
        expect(screen.getAllByRole('option').length).toBeGreaterThan(1);
      });

      const dropdown = screen.getByLabelText(/repository configuration/i);
      fireEvent.change(dropdown, { target: { value: 'config-1' } });

      await waitFor(() => {
        expect(screen.getByLabelText(/repository url/i)).toHaveValue('https://github.com/org/my-app');
      });

      // Override the auto-populated repository URL
      const repoUrlInput = screen.getByLabelText(/repository url/i);
      fireEvent.change(repoUrlInput, { target: { value: 'https://github.com/org/different-repo' } });
      expect(repoUrlInput).toHaveValue('https://github.com/org/different-repo');

      // Override the auto-populated squads
      const squadsInput = screen.getByLabelText(/required squads/i);
      fireEvent.change(squadsInput, { target: { value: 'NewSquad' } });
      expect(squadsInput).toHaveValue('NewSquad');

      // Verify fields are not disabled
      expect(repoUrlInput).not.toBeDisabled();
      expect(squadsInput).not.toBeDisabled();
      expect(screen.getByLabelText(/crash rate threshold/i)).not.toBeDisabled();
    });
  });
});
