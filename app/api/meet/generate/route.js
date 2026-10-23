import { NextResponse } from 'next/server';
import { createRealMeetLink } from '@/lib/googleMeet';

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { candidateName = 'Intern', candidateEmail = 'intern@shortfundly.com', callDateTime = new Date() } = body;

    const meetUrl = await createRealMeetLink(candidateName, candidateEmail, callDateTime);

    return NextResponse.json({
      success: true,
      meetUrl,
    });
  } catch (error) {
    console.error('Error generating live Google Meet room:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
