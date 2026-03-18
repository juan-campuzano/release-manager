/**
 * Initial database schema migration
 * Creates all tables for the Release Manager Tool
 */

import { readFileSync } from 'fs';
import { join } from 'path';

export interface Migration {
  version: number;
  name: string;
  up: (db: DatabaseConnection) => Promise<void>;
  down: (db: DatabaseConnection) => Promise<void>;
}

export interface DatabaseConnection {
  execute(sql: string): Promise<void>;
}

export const migration001: Migration = {
  version: 1,
  name: 'initial_schema',
  
  async up(db: DatabaseConnection): Promise<void> {
    const schemaPath = join(__dirname, '..', 'schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');
    
    // Split by semicolons and execute each statement
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    for (const statement of statements) {
      await db.execute(statement);
    }
  },
  
  async down(db: DatabaseConnection): Promise<void> {
    // Drop all tables in reverse order of dependencies
    const tables = [
      'release_history',
      'distributions',
      'itgc_status',
      'dau_stats',
      'quality_metrics',
      'sign_offs',
      'blockers',
      'releases'
    ];
    
    for (const table of tables) {
      await db.execute(`DROP TABLE IF EXISTS ${table}`);
    }
  }
};
