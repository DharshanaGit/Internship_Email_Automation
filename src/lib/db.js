import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';
import { config, normalizeEmail } from './config.js';
import { DEFAULT_TEMPLATES } from './templates.js';

let DatabaseSync = null;
try {
  const sqlite = await import('node:sqlite');
  DatabaseSync = sqlite.DatabaseSync || null;
} catch (importErr) {
  console.warn('[Database] node:sqlite module not available in this Node runtime, using in-memory store:', importErr?.message);
}

let dbInstance = null;

/**
 * Resilient In-Memory SQL store fallback for environments where SQLite or native filesystem is restricted
 */
class MemorySqlStore {
  constructor() {
    this.users = new Map();
    this.templates = new Map();
    this.logs = [];
    this.audit = [];
    this.settings = new Map();
    this.initDefaultData();
  }

  initDefaultData() {
    const adminEmail = normalizeEmail(config.ADMIN_EMAIL);
    const passwordHash = bcrypt.hashSync(config.ADMIN_PASSWORD, 10);
    this.users.set(adminEmail, {
      id: 'usr_admin_bootstrap',
      email: adminEmail,
      password_hash: passwordHash,
      role: 'admin',
      is_active: 1,
      can_send: 1,
      created_at: new Date().toISOString(),
    });

    for (const t of DEFAULT_TEMPLATES) {
      this.templates.set(t.id, {
        id: t.id,
        title: t.title,
        subject_template: t.subjectTemplate || t.subject_template,
        body_template: t.bodyTemplate || t.body_template,
        is_default: t.is_default ?? 0,
        created_at: new Date().toISOString(),
      });
    }

    // Default Google SMTP settings from environment
    this.settings.set('smtp_host', config.SMTP_HOST || 'smtp.gmail.com');
    this.settings.set('smtp_port', String(config.SMTP_PORT || 465));
    this.settings.set('smtp_secure', config.SMTP_SECURE ? '1' : '0');
    if (config.SMTP_USER) this.settings.set('smtp_user', config.SMTP_USER);
    if (config.SMTP_PASS) this.settings.set('smtp_pass', config.SMTP_PASS);
    this.settings.set('from_email', config.FROM_EMAIL || 'campus@shortfundly.com');
    this.settings.set('from_name', config.FROM_NAME || 'Shortfundly Campus Outreach');
    this.settings.set('smtp_auth_method', 'app_password');
  }

  exec() {
    return;
  }

  prepare(sql) {
    const s = sql.trim();
    const self = this;

    // users
    if (s.includes('FROM users WHERE email = ?')) {
      return {
        get: (email) => {
          const norm = normalizeEmail(email);
          for (const u of self.users.values()) {
            if (u.email === norm) return { ...u };
          }
          return undefined;
        }
      };
    }
    if (s.includes('FROM users WHERE id = ?')) {
      return {
        get: (id) => {
          for (const u of self.users.values()) {
            if (u.id === id) return { ...u };
          }
          return undefined;
        }
      };
    }
    if (s.includes('PRAGMA table_info(users)')) {
      return {
        all: () => [{ name: 'is_active' }, { name: 'can_send' }]
      };
    }
    if (s.startsWith('INSERT INTO users')) {
      return {
        run: (id, email, password_hash, role, is_active, can_send, created_at) => {
          self.users.set(normalizeEmail(email), { id, email: normalizeEmail(email), password_hash, role, is_active, can_send, created_at });
          return { changes: 1 };
        }
      };
    }
    if (s.startsWith('UPDATE users SET role =')) {
      return {
        run: (...args) => {
          const id = args[args.length - 1];
          for (const u of self.users.values()) {
            if (u.id === id) {
              if (args.length === 5) {
                u.role = args[0]; u.is_active = args[1]; u.can_send = args[2]; u.password_hash = args[3];
              } else {
                u.role = args[0]; u.is_active = args[1]; u.can_send = args[2];
              }
              return { changes: 1 };
            }
          }
          return { changes: 0 };
        }
      };
    }

    // email_templates
    if (s.includes('FROM email_templates') && s.includes('ORDER BY')) {
      return {
        all: () => Array.from(self.templates.values())
      };
    }
    if (s.includes('FROM email_templates WHERE id = ?')) {
      return {
        get: (id) => self.templates.get(id)
      };
    }
    if (s.startsWith('DELETE FROM email_templates WHERE id = ?')) {
      return {
        run: (id) => {
          const deleted = self.templates.delete(id);
          return { changes: deleted ? 1 : 0 };
        }
      };
    }
    if (s.includes('INSERT INTO email_templates')) {
      return {
        run: (id, title, subject_template, body_template, is_default, created_at) => {
          self.templates.set(id, { id, title, subject_template, body_template, is_default: is_default ?? 0, created_at });
          return { changes: 1 };
        }
      };
    }

    // outreach_logs
    if (s.includes('INSERT INTO outreach_logs')) {
      return {
        run: (...args) => {
          const [id, college_name, email, normalized_email, department, contact_person, designation, subject, body_html, body_text, sent_by, created_at, override_duplicate, override_reason] = args;
          self.logs.unshift({
            id, college_name, email, normalized_email, department, contact_person, designation, subject, body_html, body_text,
            status: 'PENDING', failure_type: 'NONE', attempts: 0, sent_by, created_at, override_duplicate, override_reason
          });
          return { changes: 1 };
        }
      };
    }
    if (s.includes("UPDATE outreach_logs SET status = 'PROCESSING'")) {
      return {
        run: (last_attempt_at, id) => {
          const row = self.logs.find(r => r.id === id);
          if (row) {
            row.status = 'PROCESSING';
            row.attempts = (row.attempts || 0) + 1;
            row.last_attempt_at = last_attempt_at;
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }
    if (s.includes("UPDATE outreach_logs SET status = 'ACCEPTED'")) {
      return {
        run: (smtp_response, smtp_message_id, sent_at, id) => {
          const row = self.logs.find(r => r.id === id);
          if (row) {
            row.status = 'ACCEPTED';
            row.smtp_response = smtp_response;
            row.smtp_message_id = smtp_message_id;
            row.sent_at = sent_at;
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }
    if (s.includes('UPDATE outreach_logs SET status = ?') && s.includes('failure_type = ?')) {
      return {
        run: (status, failure_type, error_message, smtp_response, id) => {
          const row = self.logs.find(r => r.id === id);
          if (row) {
            row.status = status;
            row.failure_type = failure_type;
            row.error_message = error_message;
            row.smtp_response = smtp_response;
            return { changes: 1 };
          }
          return { changes: 0 };
        }
      };
    }
    if (s.includes('FROM outreach_logs WHERE id = ?')) {
      return {
        get: (id) => self.logs.find(r => r.id === id)
      };
    }
    if (s.includes('FROM outreach_logs') && s.includes('COUNT(*)')) {
      return {
        get: () => {
          if (s.includes("status = 'ACCEPTED'")) return { count: self.logs.filter(r => r.status === 'ACCEPTED').length };
          if (s.includes("status = 'FAILED'")) return { count: self.logs.filter(r => r.status === 'FAILED').length };
          if (s.includes("status = 'PENDING'")) return { count: self.logs.filter(r => r.status === 'PENDING').length };
          if (s.includes("status = 'PROCESSING'")) return { count: self.logs.filter(r => r.status === 'PROCESSING').length };
          if (s.includes("status = 'UNKNOWN'")) return { count: self.logs.filter(r => r.status === 'UNKNOWN').length };
          return { count: self.logs.length };
        }
      };
    }
    if (s.includes('FROM outreach_logs') && !s.includes('WHERE id = ?')) {
      return {
        all: () => self.logs.slice(0, 50),
        get: () => ({ total: self.logs.length })
      };
    }
    if (s.includes('DELETE FROM outreach_logs WHERE id = ?')) {
      return {
        run: (id) => {
          const initialLen = self.logs.length;
          self.logs = self.logs.filter(r => r.id !== id);
          return { changes: self.logs.length < initialLen ? 1 : 0 };
        }
      };
    }

    // audit_logs
    if (s.includes('INSERT INTO audit_logs')) {
      return {
        run: (id, user_email, ip_address, action, details, created_at) => {
          self.audit.push({ id, user_email, ip_address, action, details, created_at });
          return { changes: 1 };
        }
      };
    }

    // system_settings
    if (s.includes('SELECT value FROM system_settings WHERE key = ?')) {
      return {
        get: (key) => {
          const val = self.settings.get(key);
          return val ? { value: val } : undefined;
        }
      };
    }
    if (s.includes('INSERT INTO system_settings') || s.includes('INSERT OR IGNORE INTO system_settings')) {
      return {
        run: (key, value) => {
          if (s.includes('INSERT OR IGNORE')) {
            if (!self.settings.has(key)) {
              self.settings.set(key, value);
            }
          } else {
            self.settings.set(key, value);
          }
          return { changes: 1 };
        }
      };
    }

    // Fallback handler
    return {
      run: () => ({ changes: 1 }),
      get: () => undefined,
      all: () => [],
    };
  }
}

export function getDb() {
  if (dbInstance) {
    return dbInstance;
  }

  const isServerless = Boolean(
    process.env.VERCEL ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  let dataDir;
  if (isServerless) {
    // In Vercel / serverless lambda, the root filesystem is read-only.
    // The only writable directory is os.tmpdir() (/tmp)
    dataDir = path.join(os.tmpdir(), 'shortfundly_campus_data');
  } else {
    const currentDir = path.dirname(fileURLToPath(import.meta.url));
    dataDir = path.resolve(currentDir, '../../data');
  }

  try {
    if (!fs.existsSync(/*turbopackIgnore: true*/ dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (fsErr) {
    console.warn('[Database] Read-only or inaccessible dataDir, falling back to os.tmpdir():', fsErr?.message);
    dataDir = os.tmpdir();
  }

  const dbPath = path.join(dataDir, 'outreach.db');

  let db;
  try {
    if (!DatabaseSync) {
      throw new Error('DatabaseSync is unavailable in current runtime');
    }
    db = new DatabaseSync(dbPath);
    if (isServerless) {
      db.exec('PRAGMA journal_mode = MEMORY;');
    } else {
      db.exec('PRAGMA journal_mode = WAL;');
    }
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

    // Pre-seed default system_settings
    const nowIso = new Date().toISOString();
    const seedSetting = db.prepare(`
      INSERT OR IGNORE INTO system_settings (key, value, updated_at, updated_by)
      VALUES (?, ?, ?, 'system')
    `);
    seedSetting.run('smtp_host', config.SMTP_HOST || 'smtp.gmail.com', nowIso);
    seedSetting.run('smtp_port', String(config.SMTP_PORT || 465), nowIso);
    seedSetting.run('smtp_secure', config.SMTP_SECURE ? '1' : '0', nowIso);
    seedSetting.run('smtp_user', config.SMTP_USER || 'dharshana.shortfundly@gmail.com', nowIso);
    if (config.SMTP_PASS) {
      seedSetting.run('smtp_pass', config.SMTP_PASS, nowIso);
    }
    seedSetting.run('from_email', config.FROM_EMAIL || 'campus@shortfundly.com', nowIso);
    seedSetting.run('from_name', config.FROM_NAME || 'Shortfundly Campus Outreach', nowIso);
    seedSetting.run('smtp_auth_method', 'app_password', nowIso);

    dbInstance = db;
    return dbInstance;
  } catch (dbInitErr) {
    console.warn('[Database] SQLite DatabaseSync failed or unavailable on this platform, activating MemorySqlStore fallback:', dbInitErr?.message);
    dbInstance = new MemorySqlStore();
    return dbInstance;
  }
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
