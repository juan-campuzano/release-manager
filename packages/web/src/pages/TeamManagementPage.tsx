import { useState, useEffect, useCallback } from 'react';
import { useServices } from '../contexts/ServicesContext';
import { TeamSummary, TeamDetail } from '../types/team';
import { TeamForm } from '../components/TeamForm';
import { MemberForm } from '../components/MemberForm';
import styles from './TeamManagementPage.module.css';

/**
 * TeamManagementPage component
 *
 * Two-panel layout for managing teams and their members.
 * Left panel: team list with create form.
 * Right panel: selected team detail with member list and add member form.
 *
 * Requirements: 1.1, 1.2, 2.1, 3.1, 3.2, 4.1, 5.1, 6.1, 6.2
 */
export function TeamManagementPage() {
  const { teamService } = useServices();

  const [teams, setTeams] = useState<TeamSummary[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<TeamDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    try {
      setError(null);
      const data = await teamService.getTeams();
      setTeams(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load teams';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [teamService]);

  const fetchTeamDetail = useCallback(async (id: string) => {
    try {
      const detail = await teamService.getTeam(id);
      setSelectedTeam(detail);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load team details';
      setError(msg);
      setSelectedTeam(null);
    }
  }, [teamService]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  useEffect(() => {
    if (selectedTeamId) {
      fetchTeamDetail(selectedTeamId);
    } else {
      setSelectedTeam(null);
    }
  }, [selectedTeamId, fetchTeamDetail]);

  const handleSelectTeam = (id: string) => {
    setSelectedTeamId(id);
  };

  const handleCreateTeam = async (name: string) => {
    const created = await teamService.createTeam(name);
    // Optimistic update: add to list and select
    setTeams(prev => [...prev, { id: created.id, name: created.name, memberCount: 0 }]);
    setSelectedTeamId(created.id);
    setSelectedTeam(created);
  };

  const handleDeleteTeam = async (id: string, teamName: string) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${teamName}"? This will remove the team and all its members.`);
    if (!confirmed) return;

    await teamService.deleteTeam(id);
    // Optimistic update: remove from list, clear selection if needed
    setTeams(prev => prev.filter(t => t.id !== id));
    if (selectedTeamId === id) {
      setSelectedTeamId(null);
      setSelectedTeam(null);
    }
  };

  const handleAddMember = async (name: string, email?: string) => {
    if (!selectedTeamId || !selectedTeam) return;

    const member = await teamService.addMember(selectedTeamId, name, email);
    // Optimistic update: add member to detail and bump count in list
    setSelectedTeam(prev =>
      prev ? { ...prev, members: [...prev.members, member] } : prev
    );
    setTeams(prev =>
      prev.map(t =>
        t.id === selectedTeamId ? { ...t, memberCount: t.memberCount + 1 } : t
      )
    );
  };

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedTeamId || !selectedTeam) return;

    await teamService.removeMember(selectedTeamId, memberId);
    // Optimistic update: remove member from detail and decrement count in list
    setSelectedTeam(prev =>
      prev ? { ...prev, members: prev.members.filter(m => m.id !== memberId) } : prev
    );
    setTeams(prev =>
      prev.map(t =>
        t.id === selectedTeamId ? { ...t, memberCount: Math.max(0, t.memberCount - 1) } : t
      )
    );
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Team Management</h1>
      </div>

      {error && (
        <div className={styles.errorMessage} role="alert">
          {error}
        </div>
      )}

      {isLoading && <div className={styles.loading}>Loading teams...</div>}

      {!isLoading && (
        <div className={styles.panels}>
          {/* Left panel: team list + create form */}
          <div className={styles.leftPanel}>
            <h2 className={styles.panelTitle}>Teams</h2>

            {teams.length === 0 ? (
              <div className={styles.emptyState}>No teams yet</div>
            ) : (
              <ul className={styles.teamList} aria-label="Team list">
                {teams.map(team => (
                  <li
                    key={team.id}
                    className={`${styles.teamItem} ${selectedTeamId === team.id ? styles.teamItemSelected : ''}`}
                    onClick={() => handleSelectTeam(team.id)}
                    role="button"
                    tabIndex={0}
                    aria-selected={selectedTeamId === team.id}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleSelectTeam(team.id);
                      }
                    }}
                  >
                    <div className={styles.teamInfo}>
                      <span className={styles.teamName}>{team.name}</span>
                      <span className={styles.memberCount}>
                        {team.memberCount} {team.memberCount === 1 ? 'member' : 'members'}
                      </span>
                    </div>
                    <button
                      type="button"
                      className={styles.deleteTeamButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteTeam(team.id, team.name);
                      }}
                      aria-label={`Delete ${team.name}`}
                    >
                      Delete
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <TeamForm onSubmit={handleCreateTeam} />
          </div>

          {/* Right panel: selected team detail + member form */}
          <div className={styles.rightPanel}>
            {!selectedTeam ? (
              <div className={styles.selectPrompt}>
                Select a team to view its details
              </div>
            ) : (
              <>
                <div className={styles.detailCard}>
                  <div className={styles.detailHeader}>
                    <h2 className={styles.detailTeamName}>{selectedTeam.name}</h2>
                  </div>

                  {selectedTeam.members.length === 0 ? (
                    <div className={styles.emptyMembers}>No members yet</div>
                  ) : (
                    <ul className={styles.memberList} aria-label="Member list">
                      {selectedTeam.members.map(member => (
                        <li key={member.id} className={styles.memberItem}>
                          <div className={styles.memberInfo}>
                            <span className={styles.memberName}>{member.name}</span>
                            {member.email && (
                              <span className={styles.memberEmail}>{member.email}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            className={styles.removeMemberButton}
                            onClick={() => handleRemoveMember(member.id)}
                            aria-label={`Remove ${member.name}`}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <MemberForm onSubmit={handleAddMember} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
