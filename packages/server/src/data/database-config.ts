/**
 * Database connection configuration
 * Provides configuration and connection management for the database
 */

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  connectionLimit?: number;
  connectTimeout?: number;
}

export interface DatabaseConnection {
  execute(sql: string, params?: any[]): Promise<any>;
  query(sql: string, params?: any[]): Promise<any[]>;
  beginTransaction(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  close(): Promise<void>;
}

/**
 * Default database configuration
 * Can be overridden via environment variables
 */
export function getDefaultConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'release_manager',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10', 10),
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10000', 10)
  };
}

/**
 * In-memory database implementation for testing
 * Uses a simple Map-based storage
 */
export class InMemoryDatabase implements DatabaseConnection {
  private tables: Map<string, Map<string, any>> = new Map();
  private transactionBackup?: Map<string, Map<string, any>>;
  
  async execute(_sql: string, _params?: any[]): Promise<any> {
    // Simple implementation for testing
    // In production, this would use a real database driver
    return { affectedRows: 0 };
  }
  
  async query(_sql: string, _params?: any[]): Promise<any[]> {
    // Simple implementation for testing
    return [];
  }
  
  async beginTransaction(): Promise<void> {
    // Create a deep copy of tables for rollback
    this.transactionBackup = new Map();
    for (const [tableName, table] of this.tables.entries()) {
      this.transactionBackup.set(tableName, new Map(table));
    }
  }
  
  async commit(): Promise<void> {
    this.transactionBackup = undefined;
  }
  
  async rollback(): Promise<void> {
    if (this.transactionBackup) {
      this.tables = this.transactionBackup;
    }
    this.transactionBackup = undefined;
  }
  
  async close(): Promise<void> {
    this.tables.clear();
  }
  
  // Helper methods for in-memory operations
  getTable(tableName: string): Map<string, any> {
    if (!this.tables.has(tableName)) {
      this.tables.set(tableName, new Map());
    }
    return this.tables.get(tableName)!;
  }
  
  insert(tableName: string, id: string, data: any): void {
    this.getTable(tableName).set(id, data);
  }
  
  get(tableName: string, id: string): any | undefined {
    return this.getTable(tableName).get(id);
  }
  
  delete(tableName: string, id: string): boolean {
    return this.getTable(tableName).delete(id);
  }
  
  getAll(tableName: string): any[] {
    return Array.from(this.getTable(tableName).values());
  }
  
  clear(tableName: string): void {
    this.getTable(tableName).clear();
  }
}

/**
 * Create a database connection
 * In production, this would create a real database connection pool
 * For now, returns an in-memory implementation for testing
 */
export function createConnection(_config?: DatabaseConfig): DatabaseConnection {
  // For now, return in-memory database for testing
  // In production, this would use mysql2, pg, or similar
  return new InMemoryDatabase();
}
