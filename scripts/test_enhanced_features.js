import {
  getGeoCountries,
  getGeoRegions,
  getGeoColleges,
  getMediaImages,
  createCampaignRecord,
  getCampaignDetails,
  getCampaignList,
  getCampaignRecipientLogs,
  recordEmailTrackingEvent,
  checkDuplicateOutreach,
} from '../src/lib/db.js';
import { queueOutreachJob } from '../src/lib/worker.js';
import { renderTemplate, validateTemplatePlaceholders } from '../src/lib/templates.js';

console.log('========================================================');
console.log('RUNNING SHORTFUNDLY ENHANCED FEATURES VERIFICATION SUITE');
console.log('========================================================\n');

let testsPassed = 0;
let testsTotal = 0;

function assert(condition, message) {
  testsTotal++;
  if (condition) {
    console.log(`[PASS] ${message}`);
    testsPassed++;
  } else {
    console.error(`[FAIL] ${message}`);
    process.exitCode = 1;
  }
}

// ----------------------------------------------------
// TEST 1: Multi-Country and Multi-State Geographic Targeting
// ----------------------------------------------------
console.log('--- TEST GROUP 1: Multi-Country & State Geographic Targeting ---');

const countries = getGeoCountries();
assert(countries.length >= 5, `Countries retrieved successfully: found ${countries.length} countries`);
assert(countries.some(c => c.name === 'India'), 'India is available in country selector');
assert(countries.some(c => c.name === 'United States'), 'United States is available in country selector');

const indiaRegions = getGeoRegions('IN');
assert(indiaRegions.length >= 5, `India regions retrieved: found ${indiaRegions.length} administrative regions`);
assert(indiaRegions.some(r => r.name === 'Andhra Pradesh'), 'Andhra Pradesh is loaded dynamically');

// Query Andhra Pradesh colleges
const apResult = getGeoColleges({ countries: ['India'], states: ['Andhra Pradesh'], limit: 10 });
assert(apResult.total >= 1800, `Andhra Pradesh dataset available with real data: found ${apResult.total} colleges`);
assert(apResult.colleges[0].contacts.length > 0, 'Colleges include associated verified contact emails');

// Query unpopulated region (e.g. United States - California)
const usResult = getGeoColleges({ countries: ['United States'], states: ['California'], limit: 10 });
assert(usResult.total === 0, 'Unpopulated country/region accurately returns 0 colleges (no fake data generated)');
console.log('Empty state message verified:', usResult.total === 0 ? 'Clearly indicates no contacts available' : 'Error');

// ----------------------------------------------------
// TEST 2: Image Support and Media Library
// ----------------------------------------------------
console.log('\n--- TEST GROUP 2: Image Support & Media Assets ---');

const mediaImages = getMediaImages();
assert(mediaImages.length >= 3, `Media library pre-seeded with brand assets: found ${mediaImages.length} images`);
assert(mediaImages.some(img => img.category === 'poster'), 'Festival poster image available');
assert(mediaImages.some(img => img.category === 'banner'), 'Promotional banner image available');
assert(mediaImages.some(img => img.category === 'logo'), 'Official logo image available');

// ----------------------------------------------------
// TEST 3: Template Placeholders & In-Sender Validation
// ----------------------------------------------------
console.log('\n--- TEST GROUP 3: Template Selection, Personalization & Placeholder Validation ---');

const testVariables = {
  college_name: 'KL University',
  institution: 'KL University',
  state: 'Andhra Pradesh',
  country: 'India',
  department: 'Media Studies',
  contact_person: 'Dr. Ramesh Babu',
  designation: 'Dean Student Affairs',
  sender_name: 'Dharshana S',
  email: 'dean.media@kluniversity.in'
};

const templateText = 'Greetings to {{contact_salutation}} from Shortfundly Campus. We propose partnering with {{college_name}} in {{state}}, {{country}}. Contact: {{email}}.';
const rendered = renderTemplate(templateText, testVariables);

assert(rendered.includes('Dr. Ramesh Babu (Dean Student Affairs)'), 'Contact person and designation personalized properly');
assert(rendered.includes('KL University in Andhra Pradesh, India'), 'College, state, and country resolved accurately');
assert(rendered.includes('dean.media@kluniversity.in'), 'Recipient email placeholder resolved');

// Placeholder validator test
const validCheck = validateTemplatePlaceholders(templateText, testVariables);
assert(validCheck.isValid === true, 'Placeholder validator passes when all tokens resolved');

const invalidTemplate = 'Hello {{college_name}}, your unresolved token is {{unresolved_token_xyz}}.';
const invalidCheck = validateTemplatePlaceholders(invalidTemplate, testVariables);
assert(invalidCheck.isValid === false, 'Placeholder validator flags unresolved tokens');
assert(invalidCheck.unresolvedTokens.includes('{{unresolved_token_xyz}}'), 'Identified specific missing token: {{unresolved_token_xyz}}');

// ----------------------------------------------------
// TEST 4: Email Tracking & Campaign Analytics
// ----------------------------------------------------
console.log('\n--- TEST GROUP 4: Email Tracking & Campaign Telemetry ---');

const campaignId = createCampaignRecord({
  name: 'Test Verification Campaign 2026',
  subject: 'Invitation to Campus Film Festival',
  templateId: 'campus-film-festival-invitation',
  bodyHtml: '<p>Test email body</p>',
  targetCountries: ['India'],
  targetStates: ['Andhra Pradesh'],
  selectedCollegesCount: 1,
  totalRecipients: 1,
  trackOpens: 1,
  trackClicks: 1,
  createdBy: 'test_admin@shortfundly.com',
});

assert(Boolean(campaignId), `Campaign record created successfully with ID: ${campaignId}`);

const trackingToken = 'test_token_' + Date.now();
const outreachId = queueOutreachJob({
  college_name: 'KL University',
  email: `test_outreach_${Date.now()}@example.com`,
  department: 'Media Studies',
  contact_person: 'Dr. Ramesh Babu',
  subject: 'Test Subject',
  body_html: '<p>Test body with tracking</p>',
  campaign_id: campaignId,
  country: 'India',
  state: 'Andhra Pradesh',
  tracking_token: trackingToken,
}, 'test_admin@shortfundly.com');

assert(Boolean(outreachId), `Outreach job queued with tracking token: ${outreachId}`);

// Simulate open tracking pixel event
const openResult = recordEmailTrackingEvent({
  outreachId,
  campaignId,
  eventType: 'OPEN',
  recipientEmail: 'test_outreach@example.com',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  ipAddress: '127.0.0.1',
});

assert(openResult.success === true, 'Open tracking event recorded in telemetry table');

// Simulate click tracking redirect event
const clickResult = recordEmailTrackingEvent({
  outreachId,
  campaignId,
  eventType: 'CLICK',
  recipientEmail: 'test_outreach@example.com',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
  ipAddress: '127.0.0.1',
  targetUrl: 'https://festival.shortfundly.com',
});

assert(clickResult.success === true, 'Click tracking event recorded in telemetry table');

// Check updated campaign telemetry details
const updatedCampaign = getCampaignDetails(campaignId);
assert(updatedCampaign.opened_count >= 1, `Campaign opened_count updated dynamically: ${updatedCampaign.opened_count}`);
assert(updatedCampaign.clicked_count >= 1, `Campaign clicked_count updated dynamically: ${updatedCampaign.clicked_count}`);

// Check campaign recipient logs
const recLogs = getCampaignRecipientLogs(campaignId, {});
assert(recLogs.records.length >= 1, `Campaign recipient logs retrieved: found ${recLogs.records.length} recipients`);
assert(recLogs.records[0].opened_at !== null, 'Recipient record reflects pixel open timestamp');
assert(recLogs.records[0].clicked_at !== null, 'Recipient record reflects link click timestamp');

console.log('\n========================================================');
console.log(`VERIFICATION SUMMARY: ${testsPassed} / ${testsTotal} TESTS PASSED!`);
console.log('========================================================\n');
