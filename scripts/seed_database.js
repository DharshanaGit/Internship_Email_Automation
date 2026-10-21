import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const dbPath = path.join(projectRoot, 'data', 'outreach.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

console.log('[Seed] Setting up tables...');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS geo_countries (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone_code TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS geo_regions (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL REFERENCES geo_countries(code) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'state',
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS colleges (
    id TEXT PRIMARY KEY,
    country_code TEXT NOT NULL,
    country_name TEXT NOT NULL,
    state_or_region TEXT NOT NULL,
    district TEXT,
    city TEXT,
    college_name TEXT NOT NULL,
    category TEXT,
    website_url TEXT,
    phone TEXT,
    source TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS college_contacts (
    id TEXT PRIMARY KEY,
    college_id TEXT NOT NULL REFERENCES colleges(id) ON DELETE CASCADE,
    contact_person TEXT,
    designation TEXT,
    department TEXT,
    email TEXT NOT NULL,
    normalized_email TEXT NOT NULL,
    phone TEXT,
    role_type TEXT DEFAULT 'generic',
    is_primary INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject TEXT NOT NULL,
    template_id TEXT,
    body_html TEXT NOT NULL,
    body_text TEXT,
    target_countries TEXT,
    target_states TEXT,
    selected_colleges_count INTEGER DEFAULT 0,
    total_recipients INTEGER DEFAULT 0,
    queued_count INTEGER DEFAULT 0,
    accepted_count INTEGER DEFAULT 0,
    failed_count INTEGER DEFAULT 0,
    opened_count INTEGER DEFAULT 0,
    clicked_count INTEGER DEFAULT 0,
    status TEXT DEFAULT 'COMPLETED',
    track_opens INTEGER DEFAULT 1,
    track_clicks INTEGER DEFAULT 1,
    created_by TEXT NOT NULL,
    created_at TEXT NOT NULL,
    completed_at TEXT
  );

  CREATE TABLE IF NOT EXISTS email_tracking_events (
    id TEXT PRIMARY KEY,
    outreach_id TEXT NOT NULL,
    campaign_id TEXT,
    event_type TEXT NOT NULL,
    recipient_email TEXT NOT NULL,
    user_agent TEXT,
    ip_address TEXT,
    target_url TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS uploaded_images (
    id TEXT PRIMARY KEY,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    url TEXT NOT NULL,
    category TEXT DEFAULT 'general',
    uploaded_by TEXT,
    created_at TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_colleges_country_state ON colleges(country_code, state_or_region);
  CREATE INDEX IF NOT EXISTS idx_colleges_name ON colleges(college_name);
  CREATE INDEX IF NOT EXISTS idx_contacts_college ON college_contacts(college_id);
  CREATE INDEX IF NOT EXISTS idx_contacts_email ON college_contacts(normalized_email);
  CREATE INDEX IF NOT EXISTS idx_campaigns_created_at ON campaigns(created_at);
  CREATE INDEX IF NOT EXISTS idx_tracking_events_outreach ON email_tracking_events(outreach_id);
`);

// Safe migrations on outreach_logs
const outreachCols = db.prepare('PRAGMA table_info(outreach_logs)').all().map(c => c.name);
const addCol = (col, typeDef) => {
  if (!outreachCols.includes(col)) {
    try {
      db.exec(`ALTER TABLE outreach_logs ADD COLUMN ${col} ${typeDef};`);
      console.log(`[Seed] Added column ${col} to outreach_logs`);
    } catch (e) {
      console.warn(`[Seed] Alter error for ${col}:`, e.message);
    }
  }
};

addCol('campaign_id', 'TEXT');
addCol('country', 'TEXT DEFAULT "India"');
addCol('state', 'TEXT DEFAULT "Andhra Pradesh"');
addCol('tracking_token', 'TEXT');
addCol('opened_at', 'TEXT');
addCol('open_count', 'INTEGER DEFAULT 0');
addCol('clicked_at', 'TEXT');
addCol('click_count', 'INTEGER DEFAULT 0');
addCol('last_clicked_url', 'TEXT');
addCol('delivery_status', 'TEXT DEFAULT "ACCEPTED"');

try {
  db.exec('CREATE INDEX IF NOT EXISTS idx_outreach_tracking_token ON outreach_logs(tracking_token);');
  db.exec('CREATE INDEX IF NOT EXISTS idx_outreach_campaign_id ON outreach_logs(campaign_id);');
} catch {}

// Seed Countries
console.log('[Seed] Seeding Countries & Regions...');
const now = new Date().toISOString();

const countriesData = [
  { code: 'IN', name: 'India', phone: '+91' },
  { code: 'US', name: 'United States', phone: '+1' },
  { code: 'GB', name: 'United Kingdom', phone: '+44' },
  { code: 'CA', name: 'Canada', phone: '+1' },
  { code: 'AU', name: 'Australia', phone: '+61' },
  { code: 'SG', name: 'Singapore', phone: '+65' },
  { code: 'AE', name: 'United Arab Emirates', phone: '+971' },
  { code: 'DE', name: 'Germany', phone: '+49' },
  { code: 'MY', name: 'Malaysia', phone: '+60' },
  { code: 'NZ', name: 'New Zealand', phone: '+64' }
];

const insertCountry = db.prepare(`
  INSERT OR IGNORE INTO geo_countries (code, name, phone_code, created_at)
  VALUES (?, ?, ?, ?)
`);
for (const c of countriesData) {
  insertCountry.run(c.code, c.name, c.phone, now);
}

// Seed Regions for Countries
const regionsData = [
  // India
  { id: 'IN-AP', country: 'IN', name: 'Andhra Pradesh', type: 'state' },
  { id: 'IN-TG', country: 'IN', name: 'Telangana', type: 'state' },
  { id: 'IN-TN', country: 'IN', name: 'Tamil Nadu', type: 'state' },
  { id: 'IN-KA', country: 'IN', name: 'Karnataka', type: 'state' },
  { id: 'IN-KL', country: 'IN', name: 'Kerala', type: 'state' },
  { id: 'IN-MH', country: 'IN', name: 'Maharashtra', type: 'state' },
  { id: 'IN-DL', country: 'IN', name: 'Delhi NCR', type: 'union_territory' },
  { id: 'IN-UP', country: 'IN', name: 'Uttar Pradesh', type: 'state' },
  { id: 'IN-GJ', country: 'IN', name: 'Gujarat', type: 'state' },
  { id: 'IN-WB', country: 'IN', name: 'West Bengal', type: 'state' },
  { id: 'IN-RJ', country: 'IN', name: 'Rajasthan', type: 'state' },
  { id: 'IN-MP', country: 'IN', name: 'Madhya Pradesh', type: 'state' },
  { id: 'IN-PB', country: 'IN', name: 'Punjab', type: 'state' },
  { id: 'IN-HR', country: 'IN', name: 'Haryana', type: 'state' },
  { id: 'IN-OR', country: 'IN', name: 'Odisha', type: 'state' },
  { id: 'IN-BR', country: 'IN', name: 'Bihar', type: 'state' },
  { id: 'IN-AS', country: 'IN', name: 'Assam', type: 'state' },

  // USA
  { id: 'US-CA', country: 'US', name: 'California', type: 'state' },
  { id: 'US-NY', country: 'US', name: 'New York', type: 'state' },
  { id: 'US-TX', country: 'US', name: 'Texas', type: 'state' },
  { id: 'US-FL', country: 'US', name: 'Florida', type: 'state' },
  { id: 'US-MA', country: 'US', name: 'Massachusetts', type: 'state' },
  { id: 'US-IL', country: 'US', name: 'Illinois', type: 'state' },
  { id: 'US-WA', country: 'US', name: 'Washington', type: 'state' },
  { id: 'US-PA', country: 'US', name: 'Pennsylvania', type: 'state' },
  { id: 'US-OH', country: 'US', name: 'Ohio', type: 'state' },
  { id: 'US-GA', country: 'US', name: 'Georgia', type: 'state' },

  // UK
  { id: 'GB-ENG', country: 'GB', name: 'England', type: 'country' },
  { id: 'GB-SCT', country: 'GB', name: 'Scotland', type: 'country' },
  { id: 'GB-WLS', country: 'GB', name: 'Wales', type: 'country' },
  { id: 'GB-NIR', country: 'GB', name: 'Northern Ireland', type: 'province' },

  // Canada
  { id: 'CA-ON', country: 'CA', name: 'Ontario', type: 'province' },
  { id: 'CA-QC', country: 'CA', name: 'Quebec', type: 'province' },
  { id: 'CA-BC', country: 'CA', name: 'British Columbia', type: 'province' },
  { id: 'CA-AB', country: 'CA', name: 'Alberta', type: 'province' },

  // Australia
  { id: 'AU-NSW', country: 'AU', name: 'New South Wales', type: 'state' },
  { id: 'AU-VIC', country: 'AU', name: 'Victoria', type: 'state' },
  { id: 'AU-QLD', country: 'AU', name: 'Queensland', type: 'state' },
  { id: 'AU-WA', country: 'AU', name: 'Western Australia', type: 'state' },

  // Singapore
  { id: 'SG-CEN', country: 'SG', name: 'Central Region', type: 'region' },
  { id: 'SG-EST', country: 'SG', name: 'East Region', type: 'region' },
  { id: 'SG-WST', country: 'SG', name: 'West Region', type: 'region' },

  // UAE
  { id: 'AE-DXB', country: 'AE', name: 'Dubai', type: 'emirate' },
  { id: 'AE-AUH', country: 'AE', name: 'Abu Dhabi', type: 'emirate' },
  { id: 'AE-SHJ', country: 'AE', name: 'Sharjah', type: 'emirate' },

  // Germany
  { id: 'DE-BY', country: 'DE', name: 'Bavaria', type: 'state' },
  { id: 'DE-BE', country: 'DE', name: 'Berlin', type: 'state' },
  { id: 'DE-NW', country: 'DE', name: 'North Rhine-Westphalia', type: 'state' },
  { id: 'DE-BW', country: 'DE', name: 'Baden-Württemberg', type: 'state' },
];

const insertRegion = db.prepare(`
  INSERT OR IGNORE INTO geo_regions (id, country_code, name, type, created_at)
  VALUES (?, ?, ?, ?, ?)
`);
for (const r of regionsData) {
  insertRegion.run(r.id, r.country, r.name, r.type, now);
}

// Seed AP Colleges from public/Andhra_Pradesh_Dataset/ap_master_dataset_cache.json
const collegeCount = db.prepare('SELECT COUNT(*) as cnt FROM colleges').get();
console.log(`[Seed] Current colleges in DB: ${collegeCount.cnt}`);

if (collegeCount.cnt === 0) {
  const apJsonPath = path.join(projectRoot, 'public', 'Andhra_Pradesh_Dataset', 'ap_master_dataset_cache.json');
  if (fs.existsSync(apJsonPath)) {
    console.log('[Seed] Importing Andhra Pradesh colleges into database...');
    const apData = JSON.parse(fs.readFileSync(apJsonPath, 'utf8'));
    const rows = apData.sheets?.['All Colleges AP Master'] || [];

    const insertCollege = db.prepare(`
      INSERT OR IGNORE INTO colleges (
        id, country_code, country_name, state_or_region, district, city,
        college_name, category, website_url, phone, source, created_at
      ) VALUES (?, 'IN', 'India', 'Andhra Pradesh', ?, ?, ?, ?, ?, ?, 'ap_master_dataset', ?)
    `);

    const insertContact = db.prepare(`
      INSERT OR IGNORE INTO college_contacts (
        id, college_id, contact_person, designation, department, email,
        normalized_email, phone, role_type, is_primary, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const extractMails = (val) => {
      if (!val) return [];
      const m = String(val).match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
      return m ? [...new Set(m.map(e => e.toLowerCase().trim()))] : [];
    };

    let insertedColleges = 0;
    let insertedContacts = 0;

    db.exec('BEGIN TRANSACTION;');
    try {
      rows.forEach((row, idx) => {
        const collegeName = (row['College name'] || row['College Name'] || '').trim();
        if (!collegeName) return;

        const collegeId = `clg_ap_${idx + 1}`;
        const district = (row['District'] || '').trim();
        const city = (row['Place'] || row['City'] || '').trim();
        const website = (row['Official website URL'] || '').trim();
        const category = (row['Academic Streams Offered'] || row['College Type'] || '').trim();
        const rawEmail = (row['Official email address'] || '').trim();
        const phone = (row['Phone / Mobile'] || row['Administrative Officer Mobile'] || '').trim();
        const contactPerson = (row['Department or contact person, if available'] || '').trim();

        insertCollege.run(
          collegeId,
          district || null,
          city || null,
          collegeName,
          category || null,
          website || null,
          phone || null,
          now
        );
        insertedColleges++;

        const emails = extractMails(rawEmail);
        emails.forEach((em, emailIdx) => {
          const contactId = `cnt_ap_${idx + 1}_${emailIdx + 1}`;
          let roleType = 'generic';
          if (contactPerson.toLowerCase().includes('principal')) roleType = 'principal';
          else if (contactPerson.toLowerCase().includes('tpo') || contactPerson.toLowerCase().includes('placement')) roleType = 'tpo';
          else if (contactPerson.toLowerCase().includes('dean')) roleType = 'dean';
          else if (contactPerson.toLowerCase().includes('hod')) roleType = 'hod';

          insertContact.run(
            contactId,
            collegeId,
            contactPerson || 'Official Representative',
            roleType === 'principal' ? 'Principal / Director' : 'Placement & Campus Officer',
            'Campus Partnerships',
            em,
            em.toLowerCase().trim(),
            phone || null,
            roleType,
            emailIdx === 0 ? 1 : 0,
            now
          );
          insertedContacts++;
        });
      });
      db.exec('COMMIT;');
      console.log(`[Seed] Successfully imported ${insertedColleges} colleges and ${insertedContacts} contacts!`);
    } catch (err) {
      db.exec('ROLLBACK;');
      console.error('[Seed] Import failed:', err);
    }
  }
}

// Seed default branding images into uploaded_images if none exist
const imgCount = db.prepare('SELECT COUNT(*) as cnt FROM uploaded_images').get();
if (imgCount.cnt === 0) {
  console.log('[Seed] Seeding brand assets and promotional banners...');
  const uploadsDir = path.join(projectRoot, 'public', 'uploads', 'email-images');
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Copy sf_logo.png to uploads/email-images/sf_logo_official.png
  const srcLogo = path.join(projectRoot, 'public', 'sf_logo.png');
  const destLogo = path.join(uploadsDir, 'sf_logo_official.png');
  if (fs.existsSync(srcLogo) && !fs.existsSync(destLogo)) {
    fs.copyFileSync(srcLogo, destLogo);
  }

  // Create SVG banner for Campus Film Festival
  const festivalSvg = `<svg width="800" height="300" viewBox="0 0 800 300" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="800" y2="300" gradientUnits="userSpaceOnUse">
      <stop stop-color="#0f172a"/>
      <stop offset="0.5" stop-color="#1e1b4b"/>
      <stop offset="1" stop-color="#311042"/>
    </linearGradient>
    <linearGradient id="g2" x1="0" y1="0" x2="300" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#f43f5e"/>
      <stop offset="1" stop-color="#fb923c"/>
    </linearGradient>
  </defs>
  <rect width="800" height="300" rx="16" fill="url(#g1)"/>
  <circle cx="720" cy="80" r="140" fill="#f43f5e" fill-opacity="0.12"/>
  <circle cx="100" cy="260" r="90" fill="#6366f1" fill-opacity="0.15"/>
  <rect x="50" y="40" width="150" height="28" rx="14" fill="#f43f5e" fill-opacity="0.2"/>
  <text x="64" y="59" fill="#f43f5e" font-family="-apple-system, sans-serif" font-size="12" font-weight="700" letter-spacing="1.5">SHORTFUNDLY CAMPUS</text>
  <text x="50" y="115" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="34" font-weight="800">National Campus Film Festival 2026</text>
  <text x="50" y="150" fill="#e2e8f0" font-family="-apple-system, sans-serif" font-size="16" font-weight="400">Official Student Screening, Distribution &amp; Awards Initiative</text>
  <rect x="50" y="180" width="460" height="42" rx="8" fill="#ffffff" fill-opacity="0.08" stroke="#ffffff" stroke-opacity="0.15"/>
  <text x="70" y="206" fill="#f8fafc" font-family="-apple-system, sans-serif" font-size="13" font-weight="500">🏆 &#x20B9;2,50,000 Prize Pool  &bull;  OTT Screening  &bull;  Industry Jury</text>
  <rect x="50" y="238" width="190" height="36" rx="18" fill="url(#g2)"/>
  <text x="80" y="261" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="13" font-weight="700">Nominate Your College &rarr;</text>
</svg>`;
  fs.writeFileSync(path.join(uploadsDir, 'sf_campus_festival_poster.svg'), festivalSvg, 'utf8');

  // Create SVG banner for Student Creator Pass
  const creatorBannerSvg = `<svg width="800" height="260" viewBox="0 0 800 260" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="800" y2="260" gradientUnits="userSpaceOnUse">
      <stop stop-color="#090d16"/>
      <stop offset="1" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="btn" x1="0" y1="0" x2="220" y2="0" gradientUnits="userSpaceOnUse">
      <stop stop-color="#2563eb"/>
      <stop offset="1" stop-color="#06b6d4"/>
    </linearGradient>
  </defs>
  <rect width="800" height="260" rx="16" fill="url(#bg)"/>
  <rect x="40" y="32" width="130" height="24" rx="12" fill="#2563eb" fill-opacity="0.25"/>
  <text x="52" y="48" fill="#60a5fa" font-family="-apple-system, sans-serif" font-size="11" font-weight="700" letter-spacing="1.2">CAMPUS PASS 2026</text>
  <text x="40" y="98" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="28" font-weight="800">Empower Student Creators with Shortfundly Hub</text>
  <text x="40" y="130" fill="#94a3b8" font-family="-apple-system, sans-serif" font-size="15">6 Creative Products in One Pass: Connect &bull; Festival &bull; Hub &bull; Marketing &bull; Ticket &bull; Tools</text>
  <rect x="40" y="155" width="520" height="34" rx="6" fill="#ffffff" fill-opacity="0.05"/>
  <text x="56" y="177" fill="#cbd5e1" font-family="-apple-system, sans-serif" font-size="12">Institutional Partner Discount Available  &bull;  Free Faculty Orientation Session</text>
  <rect x="40" y="202" width="180" height="36" rx="8" fill="url(#btn)"/>
  <text x="65" y="225" fill="#ffffff" font-family="-apple-system, sans-serif" font-size="13" font-weight="700">Explore Campus Pass &rarr;</text>
</svg>`;
  fs.writeFileSync(path.join(uploadsDir, 'sf_creator_pass_banner.svg'), creatorBannerSvg, 'utf8');

  const insertImg = db.prepare(`
    INSERT INTO uploaded_images (id, filename, original_name, mime_type, size_bytes, url, category, uploaded_by, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'system', ?)
  `);

  insertImg.run(
    'img_sf_logo_primary',
    'sf_logo_official.png',
    'Shortfundly Official Logo',
    'image/png',
    fs.existsSync(destLogo) ? fs.statSync(destLogo).size : 30606,
    '/uploads/email-images/sf_logo_official.png',
    'logo',
    now
  );

  insertImg.run(
    'img_sf_festival_poster',
    'sf_campus_festival_poster.svg',
    'Shortfundly Campus Film Festival Poster 2026',
    'image/svg+xml',
    Buffer.byteLength(festivalSvg),
    '/uploads/email-images/sf_campus_festival_poster.svg',
    'poster',
    now
  );

  insertImg.run(
    'img_sf_creator_pass',
    'sf_creator_pass_banner.svg',
    'Shortfundly Student Creator Pass Promotional Banner',
    'image/svg+xml',
    Buffer.byteLength(creatorBannerSvg),
    '/uploads/email-images/sf_creator_pass_banner.svg',
    'banner',
    now
  );

  console.log('[Seed] Pre-seeded 3 brand promotional images into media library.');
}

console.log('[Seed] Completed successfully.');
