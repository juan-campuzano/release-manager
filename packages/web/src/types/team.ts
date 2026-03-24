/**
 * Team management types for the web package.
 * Mirrors the server domain team types for frontend use.
 */

// ============================================================================
// Team Types
// ============================================================================

/** Summary of a team for list views */
export interface TeamSummary {
  id: string;
  name: string;
  memberCount: number;
}

/** Full team detail including members */
export interface TeamDetail {
  id: string;
  name: string;
  members: Member[];
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/** A member of a team */
export interface Member {
  id: string;
  name: string;
  email?: string;
  createdAt: string; // ISO 8601
}
