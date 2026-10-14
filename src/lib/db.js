import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { config, normalizeEmail } from './config.js';
import { DEFAULT_TEMPLATES } from './templates.js';

let dbInstance = null;

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  // Resolve to project root data directory reliably
  const currentDir = path.dirname(fileURLToPath(import.meta.url));
  const dataDir = path.resolve(currentDir, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'outreach.db');
  const db = new DatabaseSync(dbPath);

  // Performance and durability configuration
  db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  db.exec('PRAGMA foreign_keys = ON;');

  // Schema creation
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'admin',
      is_active INTEGER NOT NULL DEFAULT 1,
      can_send INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS outreach_logs (
      id TEXT PRIMARY KEY,
      college_name TEXT NOT NULL,
      email TEXT NOT NULL,
      normalized_email TEXT NOT NULL,
      department TEXT NOT NULL,
      contact_person TEXT,
      designation TEXT,
      subject TEXT NOT NULL,
      body_html TEXT NOT NULL,
      body_text TEXT,
      status TEXT NOT NULL CHECK(status IN ('PENDING', 'PROCESSING', 'ACCEPTED', 'FAILED', 'UNKNOWN')),
      failure_type TEXT DEFAULT 'NONE',
      error_message TEXT,
      smtp_response TEXT,
      smtp_message_id TEXT,
      attempts INTEGER DEFAULT 0,
      last_attempt_at TEXT,
      sent_by TEXT NOT NULL,
      created_at TEXT NOT NULL,
      sent_at TEXT,
      override_duplicate INTEGER DEFAULT 0,
      override_reason TEXT
    );

    CREATE TABLE IF NOT EXISTS email_templates (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      subject_template TEXT NOT NULL,
      body_template TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_email TEXT,
      ip_address TEXT,
      action TEXT NOT NULL,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      updated_by TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_outreach_normalized_email ON outreach_logs(normalized_email);
    CREATE INDEX IF NOT EXISTS idx_outreach_status ON outreach_logs(status);
    CREATE INDEX IF NOT EXISTS idx_outreach_created_at ON outreach_logs(created_at);
    CREATE INDEX IF NOT EXISTS idx_outreach_college ON outreach_logs(college_name);
    CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);
  `);

  // Safe migration checks for existing tables
  try {
    const userCols = db.prepare('PRAGMA table_info(users)').all().map((c) => c.name);
    if (!userCols.includes('is_active')) {
      db.exec('ALTER TABLE users ADD COLUMN is_active INTEGER NOT NULL DEFAULT 1;');
    }
    if (!userCols.includes('can_send')) {
      db.exec('ALTER TABLE users ADD COLUMN can_send INTEGER NOT NULL DEFAULT 1;');
    }
  } catch (migErr) {
    console.warn('[Database] Safe migration note:', migErr?.message);
  }

  // Controlled Bootstrap: Administrator creation & synchronization
  const adminEmail = normalizeEmail(config.ADMIN_EMAIL);
  const existingAdmin = db.prepare('SELECT id, password_hash, is_active FROM users WHERE email = ?').get(adminEmail);

  if (!existingAdmin) {
    const adminId = 'usr_' + Date.now();
    const passwordHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 12);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO users (id, email, password_hash, role, is_active, can_send, created_at)
      VALUES (?, ?, ?, 'admin', 1, 1, ?)
    `).run(adminId, adminEmail, passwordHash, now);

    db.prepare(`
      INSERT INTO audit_logs (id, user_email, ip_address, action, details, created_at)
      VALUES (?, ?, 'system', 'BOOTSTRAP_ADMIN_CREATED', ?, ?)
    `).run('aud_' + Date.now(), adminEmail, `Bootstrap admin created for ${adminEmail}`, now);

    console.log(`[Database] Initial company administrator bootstrap completed: ${adminEmail}`);
  } else if (!bcrypt.compareSync(config.ADMIN_PASSWORD, existingAdmin.password_hash)) {
    const passwordHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 12);
    db.prepare('UPDATE users SET password_hash = ?, is_active = 1 WHERE id = ?').run(passwordHash, existingAdmin.id);
    console.log(`[Database] Synchronized bootstrap administrator password for: ${adminEmail}`);
  }

  // Pre-seed default Shortfundly Campus outreach templates
  const templateCount = db.prepare('SELECT COUNT(*) as count FROM email_templates').get();
  if (!templateCount || templateCount.count === 0) {
    const insertTemplate = db.prepare(`
      INSERT INTO email_templates (id, title, subject_template, body_template, is_default, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    const now = new Date().toISOString();
    for (const t of DEFAULT_TEMPLATES) {
      insertTemplate.run(t.id, t.title, t.subjectTemplate, t.bodyTemplate, t.is_default, now);
    }
    console.log('[Database] Pre-seeded default Shortfundly email templates.');
  }

  dbInstance = db;
  return dbInstance;
}

/**
 * Checks for duplicates atomically within the configured cooldown window
 */
export function checkDuplicateOutreach(email, cooldownDays = config.DUPLICATE_COOLDOWN_DAYS) {
  const db = getDb();
  const normalized = normalizeEmail(email);

  // Compute cutoff timestamp
  const cutoffDate = new Date(Date.now() - cooldownDays * 24 * 60 * 60 * 1000).toISOString();

  // Look for any outreach to this recipient that was either ACCEPTED, PENDING, or PROCESSING within cooldown
  const stmt = db.prepare(`
    SELECT id, college_name, email, department, status, created_at, sent_at
    FROM outreach_logs
    WHERE normalized_email = ?
      AND created_at >= ?
      AND status IN ('ACCEPTED', 'PROCESSING', 'PENDING')
    ORDER BY created_at DESC
    LIMIT 1
  `);

  const lastRecord = stmt.get(normalized, cutoffDate);

  if (lastRecord) {
    const diffMs = Date.now() - new Date(lastRecord.created_at).getTime();
    const daysAgo = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return {
      isDuplicate: true,
      daysAgo,
      lastRecord,
      policyDays: cooldownDays,
      message: `A campus outreach email was already initiated for ${email} ${daysAgo === 0 ? 'today' : `${daysAgo} day(s) ago`} (Status: ${lastRecord.status}). Outreach cooldown is ${cooldownDays} days.`
    };
  }

  return {
    isDuplicate: false,
    policyDays: cooldownDays,
    message: 'Recipient email is clear for outreach.'
  };
}

/**
 * Writes an audit log record
 */
export function logAuditEvent(action, details, userEmail = null, ipAddress = 'unknown') {
  try {
    const db = getDb();
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    db.prepare(`
      INSERT INTO audit_logs (id, user_email, ip_address, action, details, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, userEmail, ipAddress, action, typeof details === 'string' ? details : JSON.stringify(details), new Date().toISOString());
  } catch (err) {
    console.error('[AuditLog] Failed to record audit log:', err);
  }
}

/**
 * System Settings Helpers (Database-backed with environment fallback)
 */
export function getSystemSetting(key, fallback = null) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch {
    return fallback;
  }
}

export function setSystemSetting(key, value, updatedBy = 'system') {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO system_settings (key, value, updated_at, updated_by)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value = excluded.value,
      updated_at = excluded.updated_at,
      updated_by = excluded.updated_by
  `).run(key, String(value), now, updatedBy);
}

/**
 * Retrieves the effective Google SMTP settings (DB settings prioritized, falling back to .env)
 */
export function getEffectiveSmtpSettings() {
  const host = getSystemSetting('smtp_host', config.SMTP_HOST || 'smtp.gmail.com');
  const port = Number(getSystemSetting('smtp_port', config.SMTP_PORT || 465));
  const secure = getSystemSetting('smtp_secure', config.SMTP_SECURE ? '1' : '0') === '1';
  const user = getSystemSetting('smtp_user', config.SMTP_USER || '');
  const pass = getSystemSetting('smtp_pass', config.SMTP_PASS || '');
  const from_email = getSystemSetting('from_email', config.FROM_EMAIL || user || 'campus@shortfundly.com');
  const from_name = getSystemSetting('from_name', config.FROM_NAME || 'Shortfundly Campus Outreach');
  const auth_method = getSystemSetting('smtp_auth_method', 'app_password');

  return {
    host,
    port,
    secure,
    user,
    pass,
    from_email,
    from_name,
    auth_method,
    is_configured: Boolean(user && pass),
  };
}
