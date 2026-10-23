import { NextResponse } from 'next/server';
import { generateMasterSheetBuffer } from '@/lib/masterSheetSync';

export async function GET() {
  try {
    const buffer = await generateMasterSheetBuffer();
    const dateStr = new Date().toISOString().split('T')[0];
    const filename = `Shortfundly_Internship_Master_Roster_${dateStr}.xlsx`;

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, max-age=0',
      },
    });
  } catch (error) {
    console.error('Error generating master sheet download:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
