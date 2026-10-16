import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth.js';
import { applySecurityHeaders } from '@/lib/security.js';
import fs from 'fs';
import path from 'path';

export async function GET(request) {
  const session = await getSession(request);
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const cachePath = path.join(process.cwd(), 'public', 'Andhra_Pradesh_Dataset', 'ap_master_dataset_cache.json');
    if (!fs.existsSync(cachePath)) {
      return NextResponse.json({ error: 'Dataset cache file not found' }, { status: 404 });
    }

    const rawData = fs.readFileSync(cachePath, 'utf-8');
    const parsed = JSON.parse(rawData);

    const response = NextResponse.json({
      success: true,
      sheets: parsed.sheets,
      districts: parsed.districts,
      summary: parsed.summary,
    });
    applySecurityHeaders(response.headers);
    return response;
  } catch (err) {
    console.error('[API Dataset] Error loading dataset cache:', err);
    return NextResponse.json({ error: 'Failed to load dataset' }, { status: 500 });
  }
}
