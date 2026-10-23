/**
 * Google Meet & Calendar Integration
 * Provides Google Meet link generation, direct Google Calendar web links,
 * and RFC-5545 iCalendar (.ics) invitations for automated emails.
 */

export function generateMeetCode() {
  const segment = (len) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz';
    let res = '';
    for (let i = 0; i < len; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };
  return `${segment(3)}-${segment(4)}-${segment(3)}`;
}

export function generateGoogleMeetLink(customPrefix = 'https://meet.google.com') {
  const code = generateMeetCode();
  const cleanPrefix = customPrefix.replace(/\/+$/, '');
  return `${cleanPrefix}/${code}`;
}

export function createIcsCalendarInvite({
  uid,
  title,
  description,
  meetLink,
  startDateStr,
  startTimeStr,
  durationMinutes = 45,
  organizerEmail = 'hr@shortfundly.com',
  organizerName = 'Shortfundly HR Team',
  attendeeEmail,
  attendeeName,
}) {
  const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`);
  const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

  const formatIcsDate = (date) => {
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const dtStart = formatIcsDate(startDateTime);
  const dtEnd = formatIcsDate(endDateTime);
  const dtStamp = formatIcsDate(new Date());
  const eventUid = uid || `sf-meet-${Date.now()}@shortfundly.com`;

  const icsLines = [
    'BEGIN:VCALENDAR',
    'PRODID:-//Shortfundly Media Technologies//Internship Automation//EN',
    'VERSION:2.0',
    'CALSCALE:GREGORIAN',
    'METHOD:REQUEST',
    'BEGIN:VEVENT',
    `UID:${eventUid}`,
    `DTSTAMP:${dtStamp}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    `SUMMARY:${title.replace(/[\r\n]/g, ' ')}`,
    `DESCRIPTION:${description.replace(/[\r\n]/g, '\\n')} \\n\\nJoin Google Meet: ${meetLink}`,
    `LOCATION:${meetLink}`,
    `ORGANIZER;CN=${organizerName}:mailto:${organizerEmail}`,
    `ATTENDEE;CUTYPE=INDIVIDUAL;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE;CN=${attendeeName || 'Candidate'}:mailto:${attendeeEmail}`,
    'STATUS:CONFIRMED',
    'SEQUENCE:0',
    'BEGIN:VALARM',
    'TRIGGER:-PT15M',
    'ACTION:DISPLAY',
    'DESCRIPTION:Reminder: Shortfundly Internship Call in 15 minutes',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return icsLines.join('\r\n');
}

export function generateGoogleCalendarWebUrl({
  title,
  description,
  meetLink,
  startDateStr,
  startTimeStr,
  durationMinutes = 45,
}) {
  try {
    const startDateTime = new Date(`${startDateStr}T${startTimeStr}:00`);
    const endDateTime = new Date(startDateTime.getTime() + durationMinutes * 60 * 1000);

    const fmt = (d) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const dates = `${fmt(startDateTime)}/${fmt(endDateTime)}`;

    const params = new URLSearchParams({
      action: 'TEMPLATE',
      text: title,
      dates: dates,
      details: `${description}\n\nGoogle Meet: ${meetLink}`,
      location: meetLink,
    });

    return `https://calendar.google.com/calendar/render?${params.toString()}`;
  } catch (err) {
    return 'https://calendar.google.com';
  }
}
