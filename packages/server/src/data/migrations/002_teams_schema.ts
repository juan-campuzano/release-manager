/**
 * Teams schema migration
 * Creates teams and team_members tables for Team Management
 */

import { Migration } from './001_initial_schema';

export const migration002: Migration = {
  version: 2,
  name: 'teams_schema',

  async up(db): Promise<void> {
    await db.execute(`
      CREATE TABLE IF NOT EXISTS teams (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS team_members (
        id TEXT PRIMARY KEY,
        team_id TEXT NOT NULL,
        name TEXT NOT NULL,
        email TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE
      )
    `);
  },

  async down(db): Promise<void> {
    await db.execute('DROP TABLE IF EXISTS team_members');
    await db.execute('DROP TABLE IF EXISTS teams');
  }
};
