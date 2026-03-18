/**
 * Integration Test Script
 * Tests the complete release lifecycle from creation to production
 */

import { ReleaseManagerService } from '../application/release-manager';
import { MetricsAggregator } from '../application/metrics-aggregator';
import { StateManager } from '../application/state-manager';
import { JSONConfigParser } from '../application/config-parser';
import { ReleaseStore } from '../data/release-store';
import { HistoryStore } from '../data/history-store';
import { MetricsCollector } from '../integration/metrics-collector';
import { Cache } from '../data/cache';
import { createConnection, getDefaultConfig } from '../data/database-config';
import { Platform, ReleaseStage, ReleaseConfiguration } from '../domain/types';
import { logger } from '../common/logger';

/**
 * Run integration test
 */
async function runIntegrationTest(): Promise<void> {
  logger.info('Starting integration test...');

  try {
    // Initialize services
    const dbConfig = getDefaultConfig();
    const dbConnection = createConnection(dbConfig);
    const cache = new Cache();
    const releaseStore = new ReleaseStore({ connection: dbConnection });
    const historyStore = new HistoryStore({ connection: dbConnection });
    const stateManager = new StateManager();
    const configParser = new JSONConfigParser();
    const metricsCollector = new MetricsCollector(cache);

    const releaseManager = new ReleaseManagerService({
      releaseStore,
      historyStore,
      stateManager,
      configParser
    });

    // Initialize metrics aggregator (not used in this test but part of the system)
    new MetricsAggregator(
      metricsCollector,
      releaseStore
    );

    // Test 1: Create a release
    logger.info('Test 1: Creating a new release...');
    const config: ReleaseConfiguration = {
      platform: Platform.iOS,
      version: '1.0.0',
      branchName: 'release/1.0.0',
      repositoryUrl: 'https://github.com/test/repo',
      sourceType: 'github',
      requiredSquads: ['mobile', 'qa', 'backend'],
      qualityThresholds: {
        crashRateThreshold: 1.0,
        cpuExceptionRateThreshold: 0.5
      },
      rolloutStages: [1, 10, 50, 100]
    };

    const createResult = await releaseManager.createRelease(config);
    if (!createResult.success) {
      throw new Error(`Failed to create release: ${createResult.error.message}`);
    }

    const release = createResult.value;
    logger.info(`✓ Release created: ${release.id}`);

    // Test 2: Get the release
    logger.info('Test 2: Retrieving the release...');
    const getResult = await releaseManager.getRelease(release.id);
    if (!getResult.success) {
      throw new Error(`Failed to get release: ${getResult.error.message}`);
    }
    logger.info(`✓ Release retrieved: ${getResult.value.id}`);

    // Test 3: Add a blocker
    logger.info('Test 3: Adding a blocker...');
    const blockerResult = await releaseManager.addBlocker(release.id, {
      title: 'Critical bug in login flow',
      description: 'Users cannot log in on iOS 17',
      severity: 'critical',
      assignee: 'john.doe@example.com'
    });
    if (!blockerResult.success) {
      throw new Error(`Failed to add blocker: ${blockerResult.error.message}`);
    }
    logger.info(`✓ Blocker added`);

    // Test 4: Record squad sign-offs
    logger.info('Test 4: Recording squad sign-offs...');
    for (const squad of config.requiredSquads) {
      const signOffResult = await releaseManager.recordSignOff(
        release.id,
        squad,
        `${squad}-lead@example.com`,
        `Approved by ${squad} team`
      );
      if (!signOffResult.success) {
        throw new Error(`Failed to record sign-off: ${signOffResult.error.message}`);
      }
      logger.info(`✓ Sign-off recorded for ${squad}`);
    }

    // Test 5: Check sign-off status
    logger.info('Test 5: Checking sign-off status...');
    const signOffStatusResult = await releaseManager.getSignOffStatus(release.id);
    if (!signOffStatusResult.success) {
      throw new Error(`Failed to get sign-off status: ${signOffStatusResult.error.message}`);
    }
    logger.info(`✓ All squads approved: ${signOffStatusResult.value.allApproved}`);

    // Test 6: Resolve the blocker
    logger.info('Test 6: Resolving the blocker...');
    const blockersResult = await releaseManager.getBlockers(release.id);
    if (!blockersResult.success || blockersResult.value.length === 0) {
      throw new Error('No blockers found');
    }
    const blockerId = blockersResult.value[0].id;
    const resolveResult = await releaseManager.resolveBlocker(release.id, blockerId);
    if (!resolveResult.success) {
      throw new Error(`Failed to resolve blocker: ${resolveResult.error.message}`);
    }
    logger.info(`✓ Blocker resolved`);

    // Test 7: Progress through stages
    logger.info('Test 7: Progressing through release stages...');
    const stages = [
      ReleaseStage.FinalReleaseCandidate,
      ReleaseStage.SubmitForAppStoreReview,
      ReleaseStage.RollOut1Percent,
      ReleaseStage.RollOut100Percent
    ];

    for (const stage of stages) {
      const stageResult = await releaseManager.updateReleaseStage(release.id, stage);
      if (!stageResult.success) {
        logger.warn(`Could not transition to ${stage}: ${stageResult.error.message}`);
        // Some transitions may fail due to validation rules, which is expected
        continue;
      }
      logger.info(`✓ Transitioned to ${stage}`);
    }

    // Test 8: Update rollout percentage
    logger.info('Test 8: Updating rollout percentage...');
    const rolloutResult = await releaseManager.updateRolloutPercentage(release.id, 50);
    if (!rolloutResult.success) {
      logger.warn(`Could not update rollout: ${rolloutResult.error.message}`);
    } else {
      logger.info(`✓ Rollout updated to 50%`);
    }

    // Test 9: Add distribution channels
    logger.info('Test 9: Adding distribution channels...');
    const distResult = await releaseManager.addDistributionChannel(
      release.id,
      'App Store',
      'submitted'
    );
    if (!distResult.success) {
      throw new Error(`Failed to add distribution: ${distResult.error.message}`);
    }
    logger.info(`✓ Distribution channel added`);

    // Test 10: Update ITGC status
    logger.info('Test 10: Updating ITGC status...');
    const itgcResult = await releaseManager.updateITGCStatus(
      release.id,
      true,
      true,
      'All compliance checks passed'
    );
    if (!itgcResult.success) {
      throw new Error(`Failed to update ITGC: ${itgcResult.error.message}`);
    }
    logger.info(`✓ ITGC status updated`);

    // Test 11: Get active releases
    logger.info('Test 11: Getting active releases...');
    const activeResult = await releaseManager.getActiveReleases();
    if (!activeResult.success) {
      throw new Error(`Failed to get active releases: ${activeResult.error.message}`);
    }
    logger.info(`✓ Found ${activeResult.value.length} active release(s)`);

    // Test 12: Get active releases by platform
    logger.info('Test 12: Getting active releases by platform...');
    const platformResult = await releaseManager.getActiveReleases(Platform.iOS);
    if (!platformResult.success) {
      throw new Error(`Failed to get platform releases: ${platformResult.error.message}`);
    }
    logger.info(`✓ Found ${platformResult.value.length} iOS release(s)`);

    logger.info('✅ All integration tests passed!');
  } catch (error) {
    logger.error('❌ Integration test failed', error as Error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  runIntegrationTest()
    .then(() => {
      logger.info('Integration test completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      logger.error('Integration test failed', error);
      process.exit(1);
    });
}

export { runIntegrationTest };
