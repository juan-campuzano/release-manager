-- Release Manager Tool Database Schema
-- This schema defines the persistent storage structure for releases and related data

-- Releases table: Core release information
CREATE TABLE IF NOT EXISTS releases (
  id VARCHAR(255) PRIMARY KEY,
  platform VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL,
  current_stage VARCHAR(100) NOT NULL,
  version VARCHAR(50) NOT NULL,
  branch_name VARCHAR(255) NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  repository_url TEXT NOT NULL,
  latest_build VARCHAR(255),
  latest_passing_build VARCHAR(255),
  latest_app_store_build VARCHAR(255),
  rollout_percentage INTEGER DEFAULT 0,
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  last_synced_at TIMESTAMP NOT NULL,
  INDEX idx_platform_status (platform, status),
  INDEX idx_updated_at (updated_at)
);

-- Blockers table: Issues preventing release progress
CREATE TABLE IF NOT EXISTS blockers (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  severity VARCHAR(20) NOT NULL,
  created_at TIMESTAMP NOT NULL,
  resolved_at TIMESTAMP,
  assignee VARCHAR(255),
  issue_url TEXT,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
  INDEX idx_release_active (release_id, resolved_at)
);

-- Sign-offs table: Squad approval tracking
CREATE TABLE IF NOT EXISTS sign_offs (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  squad VARCHAR(255) NOT NULL,
  approved BOOLEAN DEFAULT FALSE,
  approved_by VARCHAR(255),
  approved_at TIMESTAMP,
  comments TEXT,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
  UNIQUE KEY unique_release_squad (release_id, squad)
);

-- Quality metrics table: Crash rates and performance metrics
CREATE TABLE IF NOT EXISTS quality_metrics (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  crash_rate DECIMAL(5,2),
  cpu_exception_rate DECIMAL(5,2),
  crash_rate_threshold DECIMAL(5,2),
  cpu_exception_rate_threshold DECIMAL(5,2),
  collected_at TIMESTAMP NOT NULL,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
  INDEX idx_release_collected (release_id, collected_at)
);

-- DAU statistics table: Daily active users tracking
CREATE TABLE IF NOT EXISTS dau_stats (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  daily_active_users INTEGER NOT NULL,
  collected_at TIMESTAMP NOT NULL,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
  INDEX idx_release_collected (release_id, collected_at)
);

-- ITGC status table: Compliance tracking
CREATE TABLE IF NOT EXISTS itgc_status (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  compliant BOOLEAN NOT NULL,
  rollout_complete BOOLEAN NOT NULL,
  details TEXT,
  last_checked_at TIMESTAMP NOT NULL,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE
);

-- Distributions table: Release distribution channels
CREATE TABLE IF NOT EXISTS distributions (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  channel VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL,
  updated_at TIMESTAMP NOT NULL,
  FOREIGN KEY (release_id) REFERENCES releases(id) ON DELETE CASCADE,
  INDEX idx_release_channel (release_id, channel)
);

-- Release history table: Append-only archive for historical data
CREATE TABLE IF NOT EXISTS release_history (
  id VARCHAR(255) PRIMARY KEY,
  release_id VARCHAR(255) NOT NULL,
  snapshot_data JSON NOT NULL,
  snapshot_at TIMESTAMP NOT NULL,
  INDEX idx_release_snapshot (release_id, snapshot_at),
  INDEX idx_snapshot_at (snapshot_at)
);

-- Repository configs table: Named default configurations for repositories
CREATE TABLE IF NOT EXISTS repository_configs (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  repository_url TEXT NOT NULL,
  source_type VARCHAR(20) NOT NULL,
  required_squads TEXT NOT NULL,        -- JSON array
  quality_thresholds TEXT NOT NULL,     -- JSON object
  rollout_stages TEXT NOT NULL,         -- JSON array
  ci_pipeline_id VARCHAR(255),
  analytics_project_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL,
  updated_at TIMESTAMP NOT NULL
);
