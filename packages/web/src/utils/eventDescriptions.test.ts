import { generateEventDescription } from './eventDescriptions';
import type {
  ReleaseCreatedEvent,
  StageChangeEvent,
  BlockerAddedEvent,
  BlockerResolvedEvent,
  SignOffRecordedEvent,
  RolloutUpdatedEvent,
  DistributionUpdatedEvent,
  ITGCUpdatedEvent,
} from '../types/releaseEvent';

const base = {
  id: 'evt_1',
  releaseId: 'rel_1',
  timestamp: '2024-01-15T14:30:00Z',
};

describe('generateEventDescription', () => {
  it('describes release_created events', () => {
    const event: ReleaseCreatedEvent = {
      ...base,
      type: 'release_created',
      data: { platform: 'iOS' as any, version: '2.1.0', createdBy: 'Alice' },
    };
    expect(generateEventDescription(event)).toBe(
      'Release 2.1.0 created for iOS by Alice',
    );
  });

  it('describes stage_change events', () => {
    const event: StageChangeEvent = {
      ...base,
      type: 'stage_change',
      data: { previousStage: 'Release Branching' as any, newStage: 'Final Release Candidate' as any },
    };
    expect(generateEventDescription(event)).toBe(
      'Stage changed from Release Branching to Final Release Candidate',
    );
  });

  it('describes blocker_added events', () => {
    const event: BlockerAddedEvent = {
      ...base,
      type: 'blocker_added',
      data: {
        blockerId: 'b1',
        title: 'Crash on launch',
        severity: 'critical' as any,
        assignee: 'Bob',
      },
    };
    expect(generateEventDescription(event)).toBe(
      'critical blocker added: Crash on launch (assigned to Bob)',
    );
  });

  it('describes blocker_resolved events', () => {
    const event: BlockerResolvedEvent = {
      ...base,
      type: 'blocker_resolved',
      data: { blockerId: 'b1', title: 'Crash on launch', severity: 'critical' as any },
    };
    expect(generateEventDescription(event)).toBe(
      'Blocker resolved: Crash on launch',
    );
  });

  it('describes signoff_recorded events', () => {
    const event: SignOffRecordedEvent = {
      ...base,
      type: 'signoff_recorded',
      data: { signOffId: 's1', squad: 'QA Team', approverName: 'Carol' },
    };
    expect(generateEventDescription(event)).toBe(
      'QA Team approved by Carol',
    );
  });

  it('describes rollout_updated events', () => {
    const event: RolloutUpdatedEvent = {
      ...base,
      type: 'rollout_updated',
      data: { previousPercentage: 10, newPercentage: 50 },
    };
    expect(generateEventDescription(event)).toBe(
      'Rollout updated from 10% to 50%',
    );
  });

  it('describes distribution_updated events', () => {
    const event: DistributionUpdatedEvent = {
      ...base,
      type: 'distribution_updated',
      data: {
        channel: 'App Store',
        previousStatus: 'pending' as any,
        newStatus: 'submitted' as any,
      },
    };
    expect(generateEventDescription(event)).toBe(
      'App Store status changed from pending to submitted',
    );
  });

  it('describes itgc_updated events (compliant, complete)', () => {
    const event: ITGCUpdatedEvent = {
      ...base,
      type: 'itgc_updated',
      data: { compliant: true, rolloutComplete: true },
    };
    expect(generateEventDescription(event)).toBe(
      'ITGC status: Compliant, Rollout: Complete',
    );
  });

  it('describes itgc_updated events (non-compliant, incomplete)', () => {
    const event: ITGCUpdatedEvent = {
      ...base,
      type: 'itgc_updated',
      data: { compliant: false, rolloutComplete: false },
    };
    expect(generateEventDescription(event)).toBe(
      'ITGC status: Non-compliant, Rollout: Incomplete',
    );
  });
});
