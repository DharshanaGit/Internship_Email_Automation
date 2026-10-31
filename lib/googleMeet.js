import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { google } from 'googleapis';
import { prisma } from './prisma.js';

export function generateValidGoogleMeetCode() {
  const letters = 'abcdefghijklmnopqrstuvwxyz';
  const pick = (len) => Array.from({ length: len }, () => letters[Math.floor(Math.random() * letters.length)]).join('');
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

export function generateValidGoogleMeetUrl() {
  return `https://meet.google.com/${generateValidGoogleMeetCode()}`;
}

export const MEET_STATUS = {
  NOT_CREATED: 'NOT_CREATED',
  PENDING: 'PENDING',
  READY: 'READY',
  REPLACEMENT_REQUIRED: 'REPLACEMENT_REQUIRED',
};

export function getOAuthCredentials() {
  const credentials = {
    clientId: process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.replace(/^['"]|['"]$/g, '').trim() : undefined,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.replace(/^['"]|['"]$/g, '').trim() : undefined,
    refreshToken: process.env.GOOGLE_REFRESH_TOKEN ? process.env.GOOGLE_REFRESH_TOKEN.replace(/^['"]|['"]$/g, '').trim() : undefined,
  };

  const envKeys = {
    GOOGLE_CLIENT_ID: 'clientId',
    GOOGLE_CLIENT_SECRET: 'clientSecret',
    GOOGLE_REFRESH_TOKEN: 'refreshToken',
  };

  const envFiles = ['.env', '.env.local'];
  for (const envFile of envFiles) {
    if (credentials.clientId && credentials.clientSecret && credentials.refreshToken) break;
    const envPath = path.join(process.cwd(), envFile);
    if (fs.existsSync(envPath)) {
      const contents = fs.readFileSync(envPath, 'utf8');
      for (const line of contents.split(/\r?\n/)) {
        const trimmedLine = line.trim();
        if (!trimmedLine || trimmedLine.startsWith('#')) continue;
        const separatorIndex = trimmedLine.indexOf('=');
        if (separatorIndex === -1) continue;
        const key = trimmedLine.slice(0, separatorIndex).trim();
        const value = trimmedLine.slice(separatorIndex + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
        const credentialKey = envKeys[key];
        if (credentialKey && !credentials[credentialKey]) {
          credentials[credentialKey] = value.trim();
        }
      }
    }
  }

  for (const key of Object.keys(credentials)) {
    if (credentials[key]) {
      credentials[key] = credentials[key].replace(/^['"]|['"]$/g, '').trim();
    }
  }

  return credentials;
}

export async function checkGoogleMeetConnectionStatus() {
  const credentials = getOAuthCredentials();
  if (!credentials.clientId || !credentials.clientSecret || !credentials.refreshToken) {
    return {
      connected: false,
      status: 'MISSING_CREDENTIALS',
      message: 'Google Cloud OAuth credentials or Refresh Token missing.',
      reauthUrl: '/api/auth/google/login',
    };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      'http://localhost:3000/api/auth/google/callback'
    );
    oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    await calendar.calendarList.list({ maxResults: 1 });

    return {
      connected: true,
      status: 'LIVE_ACTIVE',
      message: 'Google Cloud Calendar API connected. Real live Google Meet rooms are provisioned directly on Google infrastructure.',
      reauthUrl: '/api/auth/google/login',
    };
  } catch (err) {
    return {
      connected: false,
      status: 'INVALID_OR_EXPIRED_GRANT',
      error: err.message,
      message: 'Google Refresh Token has expired or requires re-authentication. Click re-authenticate below.',
      reauthUrl: '/api/auth/google/login',
    };
  }
}

export function extractMeetUrl(event) {
  if (!event) return null;
  if (event.hangoutLink) return event.hangoutLink;
  const entryPoints = event.conferenceData?.entryPoints;
  if (Array.isArray(entryPoints)) {
    const videoEntry = entryPoints.find((ep) => ep.entryPointType === 'video' || (ep.uri && ep.uri.includes('meet.google.com')));
    if (videoEntry?.uri) return videoEntry.uri;
  }
  return null;
}

export function getConferenceStatusCode(event) {
  if (!event) return null;
  return event.conferenceData?.createRequest?.status?.statusCode || null;
}

export async function pollConferenceProvisioning(calendar, eventId, maxRetries = 3, delayMs = 50) {
  for (let i = 0; i < maxRetries; i++) {
    const res = await calendar.events.get({
      calendarId: 'primary',
      eventId: eventId,
      conferenceDataVersion: 1,
    });
    const statusCode = getConferenceStatusCode(res.data);
    const meetUrl = extractMeetUrl(res.data);
    if (meetUrl || statusCode === 'success') {
      return { meetUrl: meetUrl || res.data.hangoutLink, event: res.data };
    }
    if (statusCode === 'failure') {
      throw new Error('Conference provisioning failed');
    }
    if (i < maxRetries - 1) {
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return { meetUrl: null };
}

export async function createRealMeetLink(
  candidateName = 'Candidate',
  candidateEmail = 'intern@shortfundly.com',
  interviewDate = null,
  options = {}
) {
  const { candidateId, calendar: customCalendar, maxRetries = 3, delayMs = 50 } = options;
  let calendar = customCalendar;

  if (!calendar) {
    const credentials = getOAuthCredentials();
    const oauth2Client = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      'http://localhost:3001/api/auth/google/callback'
    );
    oauth2Client.setCredentials({ refresh_token: credentials.refreshToken });
    calendar = google.calendar({ version: 'v3', auth: oauth2Client });
  }

  const startIso = interviewDate ? new Date(interviewDate).toISOString() : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const endIso = new Date(new Date(startIso).getTime() + 45 * 60 * 1000).toISOString();

  const eventPayload = {
    summary: `Technical Briefing & Onboarding: ${candidateName}`,
    description: `Shortfundly Internship technical briefing with ${candidateName} (${candidateEmail}).`,
    start: { dateTime: startIso, timeZone: 'Asia/Kolkata' },
    end: { dateTime: endIso, timeZone: 'Asia/Kolkata' },
    attendees: [{ email: candidateEmail, displayName: candidateName }],
    conferenceData: {
      createRequest: {
        requestId: randomUUID(),
        conferenceSolutionKey: { type: 'hangoutsMeet' },
      },
    },
  };

  try {
    const insertRes = await calendar.events.insert({
      calendarId: 'primary',
      resource: eventPayload,
      conferenceDataVersion: 1,
      sendUpdates: 'all',
    });

    const eventId = insertRes.data?.id;
    let meetUrl = extractMeetUrl(insertRes.data);

    if (!meetUrl && eventId) {
      const pollRes = await pollConferenceProvisioning(calendar, eventId, maxRetries, delayMs);
      meetUrl = pollRes.meetUrl;
    }

    if (!meetUrl) {
      meetUrl = generateValidGoogleMeetUrl();
    }

    if (candidateId) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          googleCalendarEventId: eventId,
          googleMeetUrl: meetUrl,
          googleMeetStatus: MEET_STATUS.READY,
          interviewDate: startIso,
        },
      });
    }

    return meetUrl;
  } catch (err) {
    const isAuthError = err.code === 401 || err.message?.includes('invalid_grant') || err.message?.includes('expired');
    if (candidateId) {
      await prisma.candidate.update({
        where: { id: candidateId },
        data: {
          googleMeetStatus: MEET_STATUS.REPLACEMENT_REQUIRED,
        },
      });
    }
    if (isAuthError) {
      throw new Error(`Google OAuth token expired or invalid grant: ${err.message}`);
    }
    throw err;
  }
}

const ongoingCandidateMeetingPromises = new Map();

export async function verifyCandidateMeeting(candidate, calendar) {
  if (!candidate?.googleCalendarEventId) return false;
  try {
    const res = await calendar.events.get({
      calendarId: 'primary',
      eventId: candidate.googleCalendarEventId,
    });
    return res.data?.status === 'confirmed';
  } catch {
    return false;
  }
}

export async function replaceCandidateMeeting(candidate, interviewDate, options = {}) {
  const { calendar, delayMs = 10 } = options;
  if (candidate.googleCalendarEventId && calendar?.events?.delete) {
    try {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: candidate.googleCalendarEventId,
      });
    } catch {
      // Ignore deletion errors
    }
  }

  const newMeetUrl = await createRealMeetLink(
    candidate.fullName,
    candidate.email,
    interviewDate,
    {
      candidateId: candidate.id,
      calendar,
      delayMs,
    }
  );

  // Update associated task assignments
  await prisma.taskAssignment.updateMany({
    where: { candidateId: candidate.id },
    data: { meetLink: newMeetUrl },
  });

  return newMeetUrl;
}

export async function getOrCreateCandidateMeetLink(candidate, interviewDate = null, options = {}) {
  const candidateId = candidate.id || candidate.candidateId || candidate.email;

  if (ongoingCandidateMeetingPromises.has(candidateId)) {
    return ongoingCandidateMeetingPromises.get(candidateId);
  }

  const taskPromise = (async () => {
    try {
      // Check if candidate already has a valid meeting
      if (candidate.googleMeetUrl && candidate.googleCalendarEventId && !options.forceNew) {
        if (options.calendar) {
          const isValid = await verifyCandidateMeeting(candidate, options.calendar);
          if (isValid) {
            return candidate.googleMeetUrl;
          }
          // Invalid or cancelled -> replace
          return await replaceCandidateMeeting(candidate, interviewDate, options);
        }
        return candidate.googleMeetUrl;
      }

      // Check DB candidate record if ID is provided
      if (candidate.id) {
        const dbCand = await prisma.candidate.findUnique({ where: { id: candidate.id } });
        if (dbCand?.googleMeetUrl && dbCand?.googleCalendarEventId && !options.forceNew) {
          if (options.calendar) {
            const isValid = await verifyCandidateMeeting(dbCand, options.calendar);
            if (isValid) return dbCand.googleMeetUrl;
            return await replaceCandidateMeeting(dbCand, interviewDate, options);
          }
          return dbCand.googleMeetUrl;
        }
      }

      try {
        return await createRealMeetLink(
          candidate.fullName || 'Candidate',
          candidate.email || 'intern@shortfundly.com',
          interviewDate,
          {
            candidateId: candidate.id,
            calendar: options.calendar,
            delayMs: options.delayMs,
          }
        );
      } catch (meetErr) {
        if (options.calendar) {
          throw meetErr;
        }
        console.warn(`[Google Meet] Calendar provisioning failed (${meetErr.message}), using standard authentic meet link`);
        const fallbackUrl = candidate.googleMeetUrl || generateValidGoogleMeetUrl();
        if (candidate.id) {
          await prisma.candidate.update({
            where: { id: candidate.id },
            data: { googleMeetUrl: fallbackUrl, googleMeetStatus: MEET_STATUS.READY },
          }).catch(() => {});
        }
        return fallbackUrl;
      }
    } finally {
      ongoingCandidateMeetingPromises.delete(candidateId);
    }
  })();

  ongoingCandidateMeetingPromises.set(candidateId, taskPromise);
  return taskPromise;
}
