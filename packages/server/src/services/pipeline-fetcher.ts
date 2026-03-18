/**
 * PipelineFetcher - Orchestrates fetching CI pipeline executions for a release
 * Resolves release → config → adapter chain, delegates to the correct adapter,
 * sorts results, and enforces the 50-record limit.
 */

import { CIExecution } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import {
  ApplicationError,
  NotFoundError,
  ValidationError,
  IntegrationError,
} from '../common/errors';
import { ReleaseStore } from '../data/release-store';
import { ConfigStore } from '../data/config-store';
import { GitHubAdapter } from '../integration/github-adapter';
import { AzureDevOpsAdapter } from '../integration/azure-devops-adapter';

const MAX_EXECUTIONS = 50;

export class PipelineFetcher {
  constructor(
    private releaseStore: ReleaseStore,
    private configStore: ConfigStore,
    private githubAdapter: GitHubAdapter,
    private azureAdapter: AzureDevOpsAdapter
  ) {}

  async getExecutions(
    releaseId: string
  ): Promise<Result<CIExecution[], ApplicationError>> {
    // 1. Load release by ID
    const releaseResult = await this.releaseStore.getRelease(releaseId);
    if (!releaseResult.success) {
      return Failure(
        new NotFoundError(`Release ${releaseId} not found`)
      );
    }
    const release = releaseResult.value;

    // 2. Check repositoryConfigId — return empty if absent
    if (!release.repositoryConfigId) {
      return Success([]);
    }

    // 3. Load RepositoryConfig — return empty if missing
    const configResult = await this.configStore.getById(
      release.repositoryConfigId
    );
    if (!configResult.success) {
      return Success([]);
    }
    const config = configResult.value;

    // Return empty if ciPipelineId is absent
    if (!config.ciPipelineId) {
      return Success([]);
    }

    // 4. Select adapter based on sourceType
    let adapterResult: Result<CIExecution[], IntegrationError>;

    switch (config.sourceType) {
      case 'github': {
        // Extract owner/repo from full URL (e.g., https://github.com/owner/repo → owner/repo)
        const repository = config.repositoryUrl
          .replace(/^https?:\/\/github\.com\//, '')
          .replace(/\.git$/, '');
        adapterResult = await this.githubAdapter.getWorkflowRuns(
          repository,
          config.ciPipelineId,
          release.branchName
        );
        break;
      }
      case 'azure':
        adapterResult = await this.azureAdapter.getPipelineBuilds(
          config.ciPipelineId
        );
        break;
      default:
        return Failure(
          new ValidationError(
            `Unsupported source type: ${config.sourceType}`
          )
        );
    }

    // 5. Handle adapter errors — wrap as 502-appropriate error
    if (!adapterResult.success) {
      return Failure(
        new IntegrationError(
          adapterResult.error.message,
          adapterResult.error.cause
        )
      );
    }

    // 6. Sort by startedAt descending
    const sorted = adapterResult.value.sort(
      (a, b) =>
        new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );

    // 7. Limit to 50 records
    const limited = sorted.slice(0, MAX_EXECUTIONS);

    return Success(limited);
  }
}
