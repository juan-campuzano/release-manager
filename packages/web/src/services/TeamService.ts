import { APIClient } from '../client';
import { TeamSummary, TeamDetail, Member } from '../types/team';

/**
 * Service for managing teams and team members
 */
export class TeamService {
  private apiClient: APIClient;

  constructor(apiClient: APIClient) {
    this.apiClient = apiClient;
  }

  /**
   * Get all teams with summary information
   * @returns Promise resolving to array of team summaries
   */
  async getTeams(): Promise<TeamSummary[]> {
    const response = await this.apiClient.get<{ teams: TeamSummary[] }>('/api/teams');
    return response.teams;
  }

  /**
   * Get a team's full detail including members
   * @param id - Team ID
   * @returns Promise resolving to team detail
   */
  async getTeam(id: string): Promise<TeamDetail> {
    const response = await this.apiClient.get<{ team: TeamDetail }>(`/api/teams/${id}`);
    return response.team;
  }

  /**
   * Create a new team
   * @param name - Team name
   * @returns Promise resolving to created team detail
   */
  async createTeam(name: string): Promise<TeamDetail> {
    const response = await this.apiClient.post<{ team: TeamDetail }>('/api/teams', { name });
    return response.team;
  }

  /**
   * Delete a team and all its members
   * @param id - Team ID
   */
  async deleteTeam(id: string): Promise<void> {
    await this.apiClient.delete(`/api/teams/${id}`);
  }

  /**
   * Add a member to a team
   * @param teamId - Team ID
   * @param name - Member name
   * @param email - Optional member email
   * @returns Promise resolving to created member
   */
  async addMember(teamId: string, name: string, email?: string): Promise<Member> {
    const response = await this.apiClient.post<{ member: Member }>(
      `/api/teams/${teamId}/members`,
      { name, email }
    );
    return response.member;
  }

  /**
   * Remove a member from a team
   * @param teamId - Team ID
   * @param memberId - Member ID
   */
  async removeMember(teamId: string, memberId: string): Promise<void> {
    await this.apiClient.delete(`/api/teams/${teamId}/members/${memberId}`);
  }
}
