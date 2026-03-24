/**
 * Team Store - In-memory storage for teams and members
 * Provides CRUD operations with unique name enforcement
 */

import { TeamSummary, TeamDetail, Member } from '../domain/types';
import { Result, Success, Failure } from '../common/result';
import { NotFoundError, ConflictError, ApplicationError } from '../common/errors';
import { randomUUID } from 'crypto';

interface TeamRow {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

interface MemberRow {
  id: string;
  teamId: string;
  name: string;
  email?: string;
  createdAt: string;
}

/**
 * In-memory store for Team and Member records
 */
export class TeamStore {
  private teams: Map<string, TeamRow> = new Map();
  private members: Map<string, MemberRow> = new Map();

  /**
   * Get all teams with member counts
   */
  async getAll(): Promise<Result<TeamSummary[], ApplicationError>> {
    try {
      const summaries: TeamSummary[] = [];
      for (const team of this.teams.values()) {
        const memberCount = this.getMemberCountForTeam(team.id);
        summaries.push({
          id: team.id,
          name: team.name,
          memberCount,
        });
      }
      return Success(summaries);
    } catch (error) {
      return Failure(new ApplicationError('Failed to get teams', error as Error));
    }
  }

  /**
   * Get a team by ID with full member list
   */
  async getById(id: string): Promise<Result<TeamDetail, ApplicationError>> {
    try {
      const team = this.teams.get(id);
      if (!team) {
        return Failure(new NotFoundError(`Team '${id}' not found`));
      }

      const teamMembers = this.getMembersForTeam(id);

      return Success({
        id: team.id,
        name: team.name,
        members: teamMembers,
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      });
    } catch (error) {
      return Failure(new ApplicationError('Failed to get team', error as Error));
    }
  }

  /**
   * Create a new team with unique name enforcement
   */
  async create(name: string): Promise<Result<TeamDetail, ApplicationError>> {
    try {
      // Enforce unique name constraint
      for (const existing of this.teams.values()) {
        if (existing.name === name) {
          return Failure(
            new ConflictError(`Team name '${name}' is already in use`)
          );
        }
      }

      const now = new Date().toISOString();
      const team: TeamRow = {
        id: randomUUID(),
        name,
        createdAt: now,
        updatedAt: now,
      };

      this.teams.set(team.id, team);

      return Success({
        id: team.id,
        name: team.name,
        members: [],
        createdAt: team.createdAt,
        updatedAt: team.updatedAt,
      });
    } catch (error) {
      return Failure(new ApplicationError('Failed to create team', error as Error));
    }
  }

  /**
   * Delete a team and all its members
   */
  async delete(id: string): Promise<Result<void, ApplicationError>> {
    try {
      if (!this.teams.has(id)) {
        return Failure(new NotFoundError(`Team '${id}' not found`));
      }

      // Remove all members belonging to this team
      for (const [memberId, member] of this.members.entries()) {
        if (member.teamId === id) {
          this.members.delete(memberId);
        }
      }

      this.teams.delete(id);
      return Success(undefined);
    } catch (error) {
      return Failure(new ApplicationError('Failed to delete team', error as Error));
    }
  }

  /**
   * Add a member to a team
   */
  async addMember(
    teamId: string,
    name: string,
    email?: string
  ): Promise<Result<Member, ApplicationError>> {
    try {
      if (!this.teams.has(teamId)) {
        return Failure(new NotFoundError(`Team '${teamId}' not found`));
      }

      const now = new Date().toISOString();
      const member: MemberRow = {
        id: randomUUID(),
        teamId,
        name,
        email,
        createdAt: now,
      };

      this.members.set(member.id, member);

      // Update team's updatedAt timestamp
      const team = this.teams.get(teamId)!;
      team.updatedAt = now;

      const result: Member = {
        id: member.id,
        name: member.name,
        createdAt: member.createdAt,
      };
      if (member.email) {
        result.email = member.email;
      }

      return Success(result);
    } catch (error) {
      return Failure(new ApplicationError('Failed to add member', error as Error));
    }
  }

  /**
   * Remove a member from a team
   */
  async removeMember(
    teamId: string,
    memberId: string
  ): Promise<Result<void, ApplicationError>> {
    try {
      if (!this.teams.has(teamId)) {
        return Failure(new NotFoundError(`Team '${teamId}' not found`));
      }

      const member = this.members.get(memberId);
      if (!member || member.teamId !== teamId) {
        return Failure(new NotFoundError(`Member '${memberId}' not found in team '${teamId}'`));
      }

      this.members.delete(memberId);

      // Update team's updatedAt timestamp
      const team = this.teams.get(teamId)!;
      team.updatedAt = new Date().toISOString();

      return Success(undefined);
    } catch (error) {
      return Failure(new ApplicationError('Failed to remove member', error as Error));
    }
  }

  /**
   * Get all members for a given team
   */
  private getMembersForTeam(teamId: string): Member[] {
    const teamMembers: Member[] = [];
    for (const member of this.members.values()) {
      if (member.teamId === teamId) {
        const m: Member = {
          id: member.id,
          name: member.name,
          createdAt: member.createdAt,
        };
        if (member.email) {
          m.email = member.email;
        }
        teamMembers.push(m);
      }
    }
    return teamMembers;
  }

  /**
   * Get member count for a given team
   */
  private getMemberCountForTeam(teamId: string): number {
    let count = 0;
    for (const member of this.members.values()) {
      if (member.teamId === teamId) {
        count++;
      }
    }
    return count;
  }
}
