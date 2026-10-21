import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { getCampaignDetails, getDb } from '@/lib/db.js';

function escapeCsvField(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET(request, context) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const params = await context.params;
  const campaignId = params?.id;
  if (!campaignId) {
    return NextResponse.json({ error: 'Campaign ID required' }, { status: 400 });
  }

  try {
    const campaign = getCampaignDetails(campaignId);
    if (!campaign) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 });
    }

    const db = getDb();
    const rows = db.prepare(`
      SELECT id, college_name, email, department, contact_person, designation,
             country, state, status, failure_type, error_message, smtp_response,
             attempts, sent_at, created_at, opened_at, open_count, clicked_at,
             click_count, last_clicked_url, delivery_status
      FROM outreach_logs
      WHERE campaign_id = ?
      ORDER BY created_at DESC
    `).all(campaignId);

    const headers = [
      'Recipient Email',
      'College Name',
      'Department',
      'Contact Person',
      'Designation',
      'Country',
      'State',
      'SMTP Status',
      'Delivery Status',
      'Failure Category',
      'Error Message',
      'SMTP Server Response',
      'Attempts',
      'Queued At',
      'Sent At',
      'Email Opened (Pixel Tracked)',
      'Open Count',
      'First Opened At',
      'Link Clicked',
      'Click Count',
      'First Clicked At',
      'Last Clicked URL'
    ];

    const csvLines = [headers.join(',')];

    for (const r of rows) {
      const line = [
        escapeCsvField(r.email),
        escapeCsvField(r.college_name),
        escapeCsvField(r.department),
        escapeCsvField(r.contact_person),
        escapeCsvField(r.designation),
        escapeCsvField(r.country || 'India'),
        escapeCsvField(r.state || 'Andhra Pradesh'),
        escapeCsvField(r.status),
        escapeCsvField(r.delivery_status || r.status),
        escapeCsvField(r.failure_type),
        escapeCsvField(r.error_message),
        escapeCsvField(r.smtp_response),
        escapeCsvField(r.attempts),
        escapeCsvField(r.created_at),
        escapeCsvField(r.sent_at),
        escapeCsvField(r.opened_at ? 'YES' : 'NO'),
        escapeCsvField(r.open_count || 0),
        escapeCsvField(r.opened_at),
        escapeCsvField(r.clicked_at ? 'YES' : 'NO'),
        escapeCsvField(r.click_count || 0),
        escapeCsvField(r.clicked_at),
        escapeCsvField(r.last_clicked_url)
      ];
      csvLines.push(line.join(','));
    }

    const csvContent = csvLines.join('\r\n');
    const safeCampaignName = (campaign.name || 'Campaign').replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${safeCampaignName}_Report_${campaignId}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err) {
    console.error('[API Campaign Export] error:', err);
    return NextResponse.json({ error: 'Failed to export campaign report' }, { status: 500 });
  }
}
