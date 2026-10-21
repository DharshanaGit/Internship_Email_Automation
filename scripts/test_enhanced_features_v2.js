import { getDb } from '../src/lib/db.js';
import { htmlToPlainText, queueOutreachJob } from '../src/lib/worker.js';
import { renderTemplate } from '../src/lib/templates.js';
import fs from 'node:fs';
import path from 'node:path';

console.log('====================================================');
console.log('🧪 Shortfundly Outreach Enhancement Verification Suite');
console.log('====================================================\n');

const db = getDb();

// 1. Verify Database Schema & Migrations
console.log('--- 1. Testing Database Schema & Attachments Columns ---');
const tplCols = db.prepare('PRAGMA table_info(email_templates)').all().map(c => c.name);
const logCols = db.prepare('PRAGMA table_info(outreach_logs)').all().map(c => c.name);
const campCols = db.prepare('PRAGMA table_info(campaigns)').all().map(c => c.name);

console.log('email_templates has attachments column:', tplCols.includes('attachments'));
console.log('outreach_logs has attachments column:', logCols.includes('attachments'));
console.log('campaigns has attachments column:', campCols.includes('attachments'));

if (!tplCols.includes('attachments') || !logCols.includes('attachments') || !campCols.includes('attachments')) {
  console.error('❌ Schema check failed!');
  process.exit(1);
}
console.log('✅ Schema migration check passed.\n');

// 2. Verify India Regions (28 States + 8 UTs = 36 total)
console.log('--- 2. Testing India Geographic Administrative Regions ---');
const indiaRegions = db.prepare("SELECT name, type FROM geo_regions WHERE country_code = 'IN' ORDER BY name ASC").all();
console.log(`India regions registered in database: ${indiaRegions.length}`);
const states = indiaRegions.filter(r => r.type === 'state');
const uts = indiaRegions.filter(r => r.type === 'union_territory');
console.log(`- States: ${states.length} (Expected: 28)`);
console.log(`- Union Territories: ${uts.length} (Expected: 8)`);

if (indiaRegions.length < 36) {
  console.error('❌ Region count mismatch for India!');
  process.exit(1);
}
console.log('✅ Geographic targeting regions verified for India.\n');

// 3. Verify AP Dataset Colleges and Contacts in DB
console.log('--- 3. Testing Existing College Data ---');
const collegeCount = db.prepare("SELECT COUNT(*) as count FROM colleges WHERE state_or_region = 'Andhra Pradesh'").get();
const contactCount = db.prepare('SELECT COUNT(*) as count FROM college_contacts').get();
console.log(`Andhra Pradesh colleges loaded: ${collegeCount.count}`);
console.log(`Total college contacts loaded: ${contactCount.count}`);
if (collegeCount.count === 0) {
  console.error('❌ Expected AP colleges to be populated!');
  process.exit(1);
}
console.log('✅ College dataset verified.\n');

// 4. Test Template Attachments Serialization & Saving
console.log('--- 4. Testing Template Saving with Attachments ---');
const testTplId = 'test-tpl-' + Date.now();
const sampleAttachments = [
  {
    filename: 'Shortfundly_Campus_Pass_Brochure.pdf',
    savedName: 'brochure_test_123.pdf',
    url: '/uploads/email-attachments/brochure_test_123.pdf',
    size: 512000,
    mimeType: 'application/pdf'
  }
];

db.prepare(`
  INSERT INTO email_templates (id, title, subject_template, body_template, is_default, attachments, created_at)
  VALUES (?, ?, ?, ?, 0, ?, ?)
`).run(
  testTplId,
  'Test Template with Attachment',
  'Partnership with [College Name]',
  '<p>Dear [Contact Person], please review the attached proposal.</p>',
  JSON.stringify(sampleAttachments),
  new Date().toISOString()
);

const fetchedTpl = db.prepare('SELECT * FROM email_templates WHERE id = ?').get(testTplId);
const parsedAtts = JSON.parse(fetchedTpl.attachments);
console.log('Saved template attachments count:', parsedAtts.length);
console.log('Saved attachment filename:', parsedAtts[0].filename);

if (parsedAtts[0].filename !== 'Shortfundly_Campus_Pass_Brochure.pdf') {
  console.error('❌ Template attachment verification failed!');
  process.exit(1);
}
console.log('✅ Template attachments saved and retrieved successfully.\n');

// Clean up test template
db.prepare('DELETE FROM email_templates WHERE id = ?').run(testTplId);

// 5. Test Queue Outreach Job with Attachments & Image Tags
console.log('--- 5. Testing Worker Queueing with Attachments ---');
const testJobId = queueOutreachJob({
  college_name: 'Aditya Engineering College',
  email: 'principal@aditya.ac.in',
  department: 'Media & Communications',
  contact_person: 'Dr. M. Sreenivasa Reddy',
  designation: 'Principal',
  subject: 'Proposal for Shortfundly Campus Collaboration — Aditya Engineering College',
  body_html: `
    <p>Dear Dr. M. Sreenivasa Reddy,</p>
    <div style="text-align: center;">
      <img src="/uploads/email-images/sf_creator_pass_banner.svg" alt="Shortfundly Pass" />
    </div>
    <p>Please find our official proposal attached.</p>
  `,
  country: 'India',
  state: 'Andhra Pradesh',
  attachments: sampleAttachments,
}, 'admin@shortfundly.com');

const loggedJob = db.prepare('SELECT * FROM outreach_logs WHERE id = ?').get(testJobId);
console.log('Queued Job ID:', loggedJob.id);
console.log('Logged status:', loggedJob.status);
console.log('Logged attachments:', loggedJob.attachments);

const queuedAtts = JSON.parse(loggedJob.attachments || '[]');
if (queuedAtts.length !== 1 || queuedAtts[0].filename !== 'Shortfundly_Campus_Pass_Brochure.pdf') {
  console.error('❌ Queued job attachment check failed!');
  process.exit(1);
}
console.log('✅ Outreach job with attachments queued successfully.\n');

// Clean up test job
db.prepare('DELETE FROM outreach_logs WHERE id = ?').run(testJobId);

console.log('====================================================');
console.log('🎉 ALL ENHANCEMENT VERIFICATIONS PASSED SUCCESSFULLY!');
console.log('====================================================');
