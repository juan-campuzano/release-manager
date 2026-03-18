/**
 * Unit tests for ReleaseService
 */

import { ReleaseService } from './ReleaseService';
import { APIClient } from '../client';
import {
  Release,
  ReleaseConfig,
  Platform,
  ReleaseStage,
  ReleaseStatus,
  Blocker,
  BlockerInput,
  SignOff,
  SignOffInput,
  Distribution,
  DistributionInput,
  DistributionStatus,
  ITGCStatus,
  ITGCStatusInput,
} from '../types';

// Mock the APIClient
jest.mock('../client');

describe('ReleaseService', () => {
  let service: ReleaseService;
  let mockApiClient: jest.Mocked<APIClient>;

  beforeEach(() => {
    // Create a mock API client
    mockApiClient = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
      put: jest.fn(),
      setAuthToken: jest.fn(),
      clearAuthToken: jest.fn(),
      setUnauthorizedCallback: jest.fn(),
    } as any;

    service = new ReleaseService(mockApiClient);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create a test release
  const createTestRelease = (id: string): Release => ({
    id,
    platform: 'iOS',
    version: '1.0.0',
    branchName: 'release/1.0.0',
    repositoryUrl: 'https://github.com/test/repo',
    sourceType: 'github',
    latestBuild: 'build-123',
    latestPassingBuild: 'build-122',
    latestAppStoreBuild: 'build-120',
    currentStage: 'Release Branching',
    status: 'Current',
    rolloutPercentage: 0,
    requiredSquads: ['squad1', 'squad2'],
    qualityThresholds: {
      crashRateThreshold: 1.0,
      cpuExceptionRateThreshold: 2.0,
    },
    rolloutStages: [1, 10, 50, 100],
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastSyncedAt: '2024-01-01T00:00:00Z',
  });

  describe('getActiveReleases', () => {
    it('should fetch active releases without platform filter', async () => {
      const mockReleases = [createTestRelease('release-1'), createTestRelease('release-2')];
      mockApiClient.get.mockResolvedValue(mockReleases);

      const result = await service.getActiveReleases();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases', { params: {} });
      expect(result).toEqual(mockReleases);
    });

    it('should fetch active releases with platform filter', async () => {
      const mockReleases = [createTestRelease('release-1')];
      mockApiClient.get.mockResolvedValue(mockReleases);

      const result = await service.getActiveReleases('iOS');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases', {
        params: { platform: 'iOS' },
      });
      expect(result).toEqual(mockReleases);
    });
  });

  describe('getReleaseById', () => {
    it('should fetch a single release by ID', async () => {
      const mockRelease = createTestRelease('release-1');
      mockApiClient.get.mockResolvedValue(mockRelease);

      const result = await service.getReleaseById('release-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/release-1');
      expect(result).toEqual(mockRelease);
    });
  });

  describe('createRelease', () => {
    it('should create a new release', async () => {
      const config: ReleaseConfig = {
        platform: 'iOS',
        version: '1.0.0',
        branchName: 'release/1.0.0',
        repositoryUrl: 'https://github.com/test/repo',
        sourceType: 'github',
        requiredSquads: ['squad1'],
        qualityThresholds: {
          crashRateThreshold: 1.0,
          cpuExceptionRateThreshold: 2.0,
        },
        rolloutStages: [1, 10, 50, 100],
      };
      const mockRelease = createTestRelease('release-1');
      mockApiClient.post.mockResolvedValue(mockRelease);

      const result = await service.createRelease(config);

      expect(mockApiClient.post).toHaveBeenCalledWith('/api/releases', config);
      expect(result).toEqual(mockRelease);
    });
  });

  describe('updateStage', () => {
    it('should update release stage', async () => {
      const mockRelease = createTestRelease('release-1');
      mockApiClient.patch.mockResolvedValue(mockRelease);

      const result = await service.updateStage('release-1', 'Roll Out 1%');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/releases/release-1/stage', {
        stage: 'Roll Out 1%',
      });
      expect(result).toEqual(mockRelease);
    });
  });

  describe('updateStatus', () => {
    it('should update release status', async () => {
      const mockRelease = createTestRelease('release-1');
      mockApiClient.patch.mockResolvedValue(mockRelease);

      const result = await service.updateStatus('release-1', 'Production');

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/releases/release-1/status', {
        status: 'Production',
      });
      expect(result).toEqual(mockRelease);
    });
  });

  describe('updateRollout', () => {
    it('should update rollout percentage', async () => {
      const mockRelease = createTestRelease('release-1');
      mockApiClient.patch.mockResolvedValue(mockRelease);

      const result = await service.updateRollout('release-1', 50);

      expect(mockApiClient.patch).toHaveBeenCalledWith('/api/releases/release-1/rollout', {
        percentage: 50,
      });
      expect(result).toEqual(mockRelease);
    });
  });

  describe('getBlockers', () => {
    it('should fetch blockers for a release', async () => {
      const mockBlockers: Blocker[] = [
        {
          id: 'blocker-1',
          releaseId: 'release-1',
          title: 'Critical bug',
          description: 'Bug description',
          severity: 'critical',
          assignee: 'john@example.com',
          issueUrl: 'https://jira.example.com/ISSUE-123',
          resolved: false,
          createdAt: '2024-01-01T00:00:00Z',
          resolvedAt: null,
        },
      ];
      mockApiClient.get.mockResolvedValue(mockBlockers);

      const result = await service.getBlockers('release-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/release-1/blockers');
      expect(result).toEqual(mockBlockers);
    });
  });

  describe('addBlocker', () => {
    it('should add a blocker to a release', async () => {
      const blockerInput: BlockerInput = {
        title: 'Critical bug',
        description: 'Bug description',
        severity: 'critical',
        assignee: 'john@example.com',
        issueUrl: 'https://jira.example.com/ISSUE-123',
      };
      const mockBlocker: Blocker = {
        id: 'blocker-1',
        releaseId: 'release-1',
        ...blockerInput,
        resolved: false,
        createdAt: '2024-01-01T00:00:00Z',
        resolvedAt: null,
      };
      mockApiClient.post.mockResolvedValue(mockBlocker);

      const result = await service.addBlocker('release-1', blockerInput);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/releases/release-1/blockers',
        blockerInput
      );
      expect(result).toEqual(mockBlocker);
    });
  });

  describe('resolveBlocker', () => {
    it('should resolve a blocker', async () => {
      const mockBlocker: Blocker = {
        id: 'blocker-1',
        releaseId: 'release-1',
        title: 'Critical bug',
        description: 'Bug description',
        severity: 'critical',
        assignee: 'john@example.com',
        issueUrl: 'https://jira.example.com/ISSUE-123',
        resolved: true,
        createdAt: '2024-01-01T00:00:00Z',
        resolvedAt: '2024-01-02T00:00:00Z',
      };
      mockApiClient.patch.mockResolvedValue(mockBlocker);

      const result = await service.resolveBlocker('release-1', 'blocker-1');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/releases/release-1/blockers/blocker-1/resolve'
      );
      expect(result).toEqual(mockBlocker);
    });
  });

  describe('getSignOffs', () => {
    it('should fetch sign-offs for a release', async () => {
      const mockSignOffs: SignOff[] = [
        {
          id: 'signoff-1',
          releaseId: 'release-1',
          squad: 'squad1',
          approved: true,
          approverName: 'Jane Doe',
          comments: 'Looks good',
          approvedAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockApiClient.get.mockResolvedValue(mockSignOffs);

      const result = await service.getSignOffs('release-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/release-1/signoffs');
      expect(result).toEqual(mockSignOffs);
    });
  });

  describe('recordSignOff', () => {
    it('should record a sign-off for a release', async () => {
      const signOffInput: SignOffInput = {
        squad: 'squad1',
        approverName: 'Jane Doe',
        comments: 'Looks good',
      };
      const mockSignOff: SignOff = {
        id: 'signoff-1',
        releaseId: 'release-1',
        ...signOffInput,
        approved: true,
        approvedAt: '2024-01-01T00:00:00Z',
      };
      mockApiClient.post.mockResolvedValue(mockSignOff);

      const result = await service.recordSignOff('release-1', signOffInput);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/releases/release-1/signoffs',
        signOffInput
      );
      expect(result).toEqual(mockSignOff);
    });
  });

  describe('getDistributions', () => {
    it('should fetch distributions for a release', async () => {
      const mockDistributions: Distribution[] = [
        {
          id: 'dist-1',
          releaseId: 'release-1',
          channel: 'App Store',
          status: 'live',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];
      mockApiClient.get.mockResolvedValue(mockDistributions);

      const result = await service.getDistributions('release-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/release-1/distributions');
      expect(result).toEqual(mockDistributions);
    });
  });

  describe('addDistribution', () => {
    it('should add a distribution to a release', async () => {
      const distributionInput: DistributionInput = {
        channel: 'App Store',
        status: 'pending',
      };
      const mockDistribution: Distribution = {
        id: 'dist-1',
        releaseId: 'release-1',
        ...distributionInput,
        updatedAt: '2024-01-01T00:00:00Z',
      };
      mockApiClient.post.mockResolvedValue(mockDistribution);

      const result = await service.addDistribution('release-1', distributionInput);

      expect(mockApiClient.post).toHaveBeenCalledWith(
        '/api/releases/release-1/distributions',
        distributionInput
      );
      expect(result).toEqual(mockDistribution);
    });
  });

  describe('updateDistribution', () => {
    it('should update distribution status', async () => {
      const mockDistribution: Distribution = {
        id: 'dist-1',
        releaseId: 'release-1',
        channel: 'App Store',
        status: 'live',
        updatedAt: '2024-01-01T00:00:00Z',
      };
      mockApiClient.patch.mockResolvedValue(mockDistribution);

      const result = await service.updateDistribution('release-1', 'App Store', 'live');

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/releases/release-1/distributions/App Store',
        { status: 'live' }
      );
      expect(result).toEqual(mockDistribution);
    });
  });

  describe('getITGCStatus', () => {
    it('should fetch ITGC status for a release', async () => {
      const mockITGCStatus: ITGCStatus = {
        releaseId: 'release-1',
        compliant: true,
        rolloutComplete: false,
        details: 'In progress',
        checkedAt: '2024-01-01T00:00:00Z',
      };
      mockApiClient.get.mockResolvedValue(mockITGCStatus);

      const result = await service.getITGCStatus('release-1');

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/release-1/itgc');
      expect(result).toEqual(mockITGCStatus);
    });
  });

  describe('updateITGCStatus', () => {
    it('should update ITGC status for a release', async () => {
      const statusInput: ITGCStatusInput = {
        compliant: true,
        rolloutComplete: true,
        details: 'Completed',
      };
      const mockITGCStatus: ITGCStatus = {
        releaseId: 'release-1',
        ...statusInput,
        checkedAt: '2024-01-01T00:00:00Z',
      };
      mockApiClient.patch.mockResolvedValue(mockITGCStatus);

      const result = await service.updateITGCStatus('release-1', statusInput);

      expect(mockApiClient.patch).toHaveBeenCalledWith(
        '/api/releases/release-1/itgc',
        statusInput
      );
      expect(result).toEqual(mockITGCStatus);
    });
  });

  describe('getReleaseHistory', () => {
    it('should fetch release history without filters', async () => {
      const mockReleases = [createTestRelease('release-1'), createTestRelease('release-2')];
      mockApiClient.get.mockResolvedValue(mockReleases);

      const result = await service.getReleaseHistory();

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/history', { params: {} });
      expect(result).toEqual(mockReleases);
    });

    it('should fetch release history with platform filter', async () => {
      const mockReleases = [createTestRelease('release-1')];
      mockApiClient.get.mockResolvedValue(mockReleases);

      const result = await service.getReleaseHistory({ platform: 'iOS' });

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/history', {
        params: { platform: 'iOS' },
      });
      expect(result).toEqual(mockReleases);
    });

    it('should fetch release history with all filters', async () => {
      const mockReleases = [createTestRelease('release-1')];
      mockApiClient.get.mockResolvedValue(mockReleases);

      const filters = {
        platform: 'iOS' as Platform,
        status: 'Production' as ReleaseStatus,
        startDate: '2024-01-01T00:00:00Z',
        endDate: '2024-12-31T23:59:59Z',
      };

      const result = await service.getReleaseHistory(filters);

      expect(mockApiClient.get).toHaveBeenCalledWith('/api/releases/history', {
        params: {
          platform: 'iOS',
          status: 'Production',
          startDate: '2024-01-01T00:00:00Z',
          endDate: '2024-12-31T23:59:59Z',
        },
      });
      expect(result).toEqual(mockReleases);
    });
  });
});
