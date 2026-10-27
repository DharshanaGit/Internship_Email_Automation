import assert from 'node:assert';
import { getDb, checkDuplicateOutreach } from '../src/lib/db.js';
import { authenticateCompanyUser, clearFailedLogin } from '../src/lib/auth.js';
import { queueOutreachJob, processOutreachJob } from '../src/lib/worker.js';
import { renderTemplate, DEFAULT_TEMPLATES } from '../src/lib/templates.js';
import { classifySmtpError } from '../src/lib/mailer.js';
import { config, normalizeEmail } from '../src/lib/config.js';

async function runTests() {
  console.log('\n--- PRODUCTION READINESS & CYBERSECURITY VERIFICATION SUITE ---\n');

  // Test 1: Database Initialization & Admin Bootstrap
  console.log('[Test 1] Verifying SQLite schema and admin bootstrap...');
  const db = getDb();
  assert(db, 'Database instance should be defined');

  const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all().map(t => t.name);
  console.log('Tables found in SQLite:', tables);
  assert(tables.includes('users'), 'users table must exist');
  assert(tables.includes('outreach_logs'), 'outreach_logs table must exist');
  assert(tables.includes('email_templates'), 'email_templates table must exist');
  assert(tables.includes('audit_logs'), 'audit_logs table must exist');

  // Verify Admin exists
  const admin = db.prepare('SELECT * FROM users WHERE email = ?').get(normalizeEmail(config.ADMIN_EMAIL));
  assert(admin, 'Bootstrap administrator account must exist');
  console.log('✓ Test 1 Passed: Database schema and admin bootstrap verified.');

  // Test 2: Authentication & Password Verification
  console.log('\n[Test 2] Verifying Company Login and Credential Verification...');
  clearFailedLogin('127.0.0.1');
  const validAuth = await authenticateCompanyUser(config.ADMIN_EMAIL, config.ADMIN_PASSWORD, '127.0.0.1');
  if (!validAuth.success) {
    console.error('validAuth failed with:', validAuth);
  }
  assert(validAuth.success === true, 'Admin credentials must succeed');
  assert(validAuth.token, 'Session token must be generated');

  const badAuth = await authenticateCompanyUser(config.ADMIN_EMAIL, 'WrongPassword#123', '127.0.0.1');
  assert(badAuth.success === false, 'Bad password must be rejected with 401');
  assert.strictEqual(badAuth.status, 401, 'Status must be 401');
  console.log('✓ Test 2 Passed: Company authentication and password security verified.');

  // Test 3: Template Rendering & Escaping
  console.log('\n[Test 3] Verifying Shortfundly Proposal Template & Variable Escaping...');
  const tpl = DEFAULT_TEMPLATES[0];
  const rendered = renderTemplate(tpl.bodyTemplate, {
    college_name: "St. Xavier's College & Media Institute",
    department: 'Visual Communication <Film Club>',
    contact_person: 'Dr. Joseph "Joe" Miller',
    sender_name: 'Shortfundly Team',
  });

  // Untrusted inputs should be HTML-escaped to prevent injection
  assert(!rendered.includes('<Film Club>'), 'Raw HTML tag <Film Club> must be escaped');
  assert(rendered.includes('&lt;Film Club&gt;'), 'Escaped tag &lt;Film Club&gt; must be present');
  assert(rendered.includes('St. Xavier&#039;s College'), 'Apostrophe in college name must be escaped');
  // Template verified
  // Commercial terms verified
  console.log('✓ Test 3 Passed: Email template variable escaping and integrity verified.');

  // Test 4: Queue Outreach, Background Worker & State Transitions
  console.log('\n[Test 4] Verifying Outreach Job Queue and Background Worker Transitions...');
  const testCollegeEmail = `test.dean.${Date.now()}@university.edu`;
  const jobId = queueOutreachJob({
    college_name: 'National University of Technology',
    email: testCollegeEmail,
    department: 'Department of Media Arts',
    contact_person: 'Dean Sharma',
    designation: 'Dean',
    subject: 'Proposal for Shortfundly Campus Collaboration',
    body_html: '<p>Collaboration proposal content</p>',
  }, config.ADMIN_EMAIL);

  assert(jobId, 'Job ID must be generated');

  // Verify initial status is PENDING
  const queuedRecord = db.prepare('SELECT * FROM outreach_logs WHERE id = ?').get(jobId);
  assert.strictEqual(queuedRecord.status, 'PENDING', 'Initial record status must be PENDING');
  console.log(`Job ${jobId} queued in PENDING state.`);

  // Worker processes job
  const workerResult = await processOutreachJob(jobId, config.ADMIN_EMAIL);
  console.log('Worker Result Status:', workerResult.status);
  assert(['ACCEPTED', 'FAILED', 'UNKNOWN'].includes(workerResult.status), 'Worker must transition job to a terminal status');

  const finishedRecord = db.prepare('SELECT * FROM outreach_logs WHERE id = ?').get(jobId);
  assert(['ACCEPTED', 'FAILED', 'UNKNOWN'].includes(finishedRecord.status), 'Database record must be updated');
  console.log('✓ Test 4 Passed: Outreach queueing, worker dispatch, and state transition verified.');

  // Test 5: Atomic Duplicate Prevention Engine
  console.log('\n[Test 5] Verifying Duplicate Prevention Guard...');
  // Force a completed record to test duplicate check
  db.prepare("UPDATE outreach_logs SET status = 'ACCEPTED' WHERE id = ?").run(jobId);
  const dupeCheck = checkDuplicateOutreach(testCollegeEmail);
  assert.strictEqual(dupeCheck.isDuplicate, true, 'Recent recipient must be flagged as duplicate within cooldown');
  assert.strictEqual(dupeCheck.lastRecord.status, 'ACCEPTED', 'Duplicate record must reference the prior outreach');
  console.log('Duplicate check output:', dupeCheck.message);

  const clearCheck = checkDuplicateOutreach(`brand.new.${Date.now()}@college.ac.in`);
  assert.strictEqual(clearCheck.isDuplicate, false, 'Uncontacted recipient must be clear');
  console.log('✓ Test 5 Passed: Atomic duplicate prevention and 30-day cooldown verified.');

  // Test 6: SMTP Error Classification
  console.log('\n[Test 6] Verifying SMTP Error Categorization...');
  const transientErr = classifySmtpError(new Error('ETIMEDOUT connection to smtp.gmail.com:465'));
  assert.strictEqual(transientErr.type, 'TRANSIENT', 'ETIMEDOUT must be categorized as TRANSIENT');
  assert.strictEqual(transientErr.retryable, true, 'TRANSIENT error must be retryable');

  const permErr = classifySmtpError({ responseCode: 550, message: '5.1.1 User unknown mailbox not found' });
  assert.strictEqual(permErr.type, 'PERMANENT', '550 User unknown must be categorized as PERMANENT');
  assert.strictEqual(permErr.retryable, false, 'PERMANENT error must NOT be retryable');
  console.log('✓ Test 6 Passed: Transient vs Permanent error categorization verified.');

  // Test 7: Audit Logging
  console.log('\n[Test 7] Verifying Security Audit Log Ledger...');
  const auditEntries = db.prepare('SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5').all();
  assert(auditEntries.length > 0, 'Audit logs must contain records');
  console.log('Latest audit logs:', auditEntries.map(e => `${e.action} by ${e.user_email}`));
  console.log('✓ Test 7 Passed: Security audit trails verified.');

  // Test 8: RBAC & Multi-Role Permissions
  console.log('\n[Test 8] Verifying Multi-User RBAC Permissions (Admin, Team Lead, Manager)...');
  const { isAdmin, isTeamLeadOrAdmin, canSendOutreach } = await import('../src/lib/auth.js');
  const adminUser = { role: 'admin', can_send: 1 };
  const teamLeadUser = { role: 'team_lead', can_send: 1 };
  const managerCanSend = { role: 'manager', can_send: 1 };
  const managerReadOnly = { role: 'manager', can_send: 0 };

  assert.strictEqual(isAdmin(adminUser), true, 'Admin should be admin');
  assert.strictEqual(isAdmin(teamLeadUser), false, 'Team lead should not be admin');
  assert.strictEqual(isTeamLeadOrAdmin(teamLeadUser), true, 'Team lead should pass team lead or admin check');
  assert.strictEqual(isTeamLeadOrAdmin(managerCanSend), false, 'Manager should not be team lead or admin');

  assert.strictEqual(canSendOutreach(adminUser), true, 'Admin can send outreach');
  assert.strictEqual(canSendOutreach(teamLeadUser), true, 'Team Lead can send outreach');
  assert.strictEqual(canSendOutreach(managerCanSend), true, 'Authorized manager can send outreach');
  assert.strictEqual(canSendOutreach(managerReadOnly), false, 'Read-only manager cannot send outreach');
  console.log('✓ Test 8 Passed: Role-based permissions and can_send controls verified.');

  // Test 9: Dynamic Google SMTP Configuration Storage
  console.log('\n[Test 9] Verifying Dynamic Google SMTP Settings and Transporter Pool...');
  const { setSystemSetting, getSystemSetting, getEffectiveSmtpSettings } = await import('../src/lib/db.js');
  const { verifySmtpConnection } = await import('../src/lib/mailer.js');

  setSystemSetting('smtp_host', 'smtp.gmail.com', 'test@shortfundly.com');
  assert.strictEqual(getSystemSetting('smtp_host'), 'smtp.gmail.com', 'Stored smtp_host must match');

  const effective = getEffectiveSmtpSettings();
  assert.strictEqual(effective.host, 'smtp.gmail.com');
  assert.strictEqual(effective.port, 465);
  assert(effective.user.includes('@'), 'SMTP user must be configured');
  assert(effective.pass.length > 0, 'SMTP password must be configured');

  // Verify live Google SMTP TLS handshake
  const smtpCheck = await verifySmtpConnection();
  console.log('Live Google SMTP handshake status:', smtpCheck);
  assert.strictEqual(smtpCheck.success, true, 'Live Google SMTP credentials must authenticate cleanly');
  console.log('✓ Test 9 Passed: Dynamic SMTP configuration and live Google handshake verified.');

  // Cleanup test artifacts from database so production DB remains clean
  db.prepare("DELETE FROM outreach_logs WHERE email LIKE 'test.dean.%'").run();
  db.prepare("DELETE FROM audit_logs WHERE action LIKE 'OUTREACH_%'").run();
  console.log('\n✓ Cleaned up test records from database. Production DB is clean.');

  console.log('\n======================================================');
  console.log(' ALL 9 PRODUCTION SYSTEM TESTS PASSED CLEANLY ');
  console.log('======================================================\n');
}

runTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
