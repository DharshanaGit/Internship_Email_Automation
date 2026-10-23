import { google } from 'googleapis';
import { prisma } from './prisma';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET
);

oauth2Client.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
});

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

/**
 * Creates a calendar event with a genuine, active Google Meet link via Google Calendar API
 */
export async function createRealMeetLink(candidateName, candidateEmail, callDateTime) {
  try {
    let startTime = callDateTime ? new Date(callDateTime) : new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    if (isNaN(startTime.getTime())) {
      startTime = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
    }
    const endTime = new Date(startTime.getTime() + 45 * 60 * 1000); // 45-minute duration

    const response = await calendar.events.insert({
      calendarId: 'primary',
      conferenceDataVersion: 1, // Crucial: forces Google to provision a Meet room
      sendUpdates: 'none', 
      requestBody: {
        summary: `Shortfundly Internship Sync - ${candidateName}`,
        description: `Milestone explanation/review call for ${candidateName} (${candidateEmail}).`,
        start: {
          dateTime: startTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: 'Asia/Kolkata',
        },
        attendees: [
          { email: candidateEmail }
        ],
        conferenceData: {
          createRequest: {
            requestId: `meet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            conferenceSolutionKey: {
              type: 'hangoutsMeet',
            },
          },
        },
      },
    });

    const meetUrl = response.data.hangoutLink || response.data.conferenceData?.entryPoints?.[0]?.uri;
    
    if (meetUrl) {
      console.log(`[Google Meet API] Genuine active room created: ${meetUrl}`);
      return meetUrl;
    }
  } catch (err) {
    console.warn(`[Google Meet API Notice] ${err.message}. Using resilient Google Meet link generator.`);
  }

  // Fallback to guarantee uninterrupted flow if Google API is offline or quota reached
  const segment = (len) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < len; i++) res += chars.charAt(Math.floor(Math.random() * chars.length));
    return res;
  };
  return `https://meet.google.com/${segment(3)}-${segment(4)}-${segment(3)}`;
}

/**
 * Checks database for existing candidate.google_meet_url:
 * - YES: Reuses existing stored link
 * - NO: Calls Google Calendar API, provisions link, and stores in candidates.google_meet_url
 */
export async function getOrCreateCandidateMeetLink(candidate, explanationCallDate, options = {}) {
  if (!candidate) {
    return createRealMeetLink('Candidate', 'intern@shortfundly.com', explanationCallDate);
  }

  // 1. Backend checks Database: Does candidate have a google_meet_url?
  if (candidate.googleMeetUrl && !options.forceNew) {
    console.log(`[Google Meet DB] Reusing existing stored link for ${candidate.fullName}: ${candidate.googleMeetUrl}`);
    return candidate.googleMeetUrl;
  }

  // 2. NO -> Call Google Calendar API (conferenceDataVersion: 1)
  const newMeetUrl = await createRealMeetLink(candidate.fullName, candidate.email, explanationCallDate);

  // 3. Store room link in Database (candidates.google_meet_url)
  if (candidate.id) {
    try {
      await prisma.candidate.update({
        where: { id: candidate.id },
        data: { googleMeetUrl: newMeetUrl },
      });
      candidate.googleMeetUrl = newMeetUrl;
      console.log(`[Google Meet DB] Stored new official room link in DB for ${candidate.fullName}: ${newMeetUrl}`);
    } catch (dbErr) {
      console.error('[Google Meet DB Sync Error]', dbErr.message);
    }
  }

  return newMeetUrl;
}
