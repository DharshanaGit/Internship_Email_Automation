import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  MEET_STATUS,
  extractMeetUrl,
  getConferenceStatusCode,
  pollConferenceProvisioning,
  createRealMeetLink,
  getOrCreateCandidateMeetLink,
  replaceCandidateMeeting,
  verifyCandidateMeeting,
} from '../lib/googleMeet.js';
import { prisma } from '../lib/prisma.js';

describe('Google Meet Integration & Lifecycle Test Suite', () => {
  const testCandidateEmail = `test.meet.${Date.now()}@shortfundly.com`;
  let testCandidate = null;

  beforeEach(async () => {
    // Create fresh test candidate in DB
    testCandidate = await prisma.candidate.create({
      data: {
        candidateId: `SF-MEET-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        fullName: 'Meet Integration Candidate',
        email: `candidate.${Date.now()}-${Math.random()}@shortfundly.com`,
        role: 'Web Developer Intern',
        department: 'Engineering',
        joiningDate: '2026-11-01',
        endDate: '2026-12-01',
        duration: '1 Month',
        workMode: 'Online - Remote',
        reportingManager: 'M. Selvam',
        assignedMentor: 'Tech Lead',
        offerLetterStatus: 'Sent',
        taskStatus: 'Not Assigned',
        googleMeetStatus: MEET_STATUS.NOT_CREATED,
      },
    });
  });

  it('1. Verifies lifecycle status constants and candidate schema fields', async () => {
    expect(MEET_STATUS.NOT_CREATED).toBe('NOT_CREATED');
    expect(MEET_STATUS.PENDING).toBe('PENDING');
    expect(MEET_STATUS.READY).toBe('READY');
    expect(MEET_STATUS.REPLACEMENT_REQUIRED).toBe('REPLACEMENT_REQUIRED');

    expect(testCandidate.googleMeetStatus).toBe(MEET_STATUS.NOT_CREATED);
    expect(testCandidate.googleCalendarEventId).toBeNull();
    expect(testCandidate.googleMeetUrl).toBeNull();
    expect(testCandidate.interviewDate).toBeNull();
  });

  it('2. Correctly extracts Meet URL from conference entryPoints and hangoutLink', () => {
    const eventWithHangout = {
      hangoutLink: 'https://meet.google.com/abc-defg-hij',
    };
    expect(extractMeetUrl(eventWithHangout)).toBe('https://meet.google.com/abc-defg-hij');

    const eventWithEntryPoints = {
      conferenceData: {
        entryPoints: [
          { entryPointType: 'video', uri: 'https://meet.google.com/uvw-xyza-bcd' },
          { entryPointType: 'phone', uri: 'tel:+123456789' },
        ],
      },
    };
    expect(extractMeetUrl(eventWithEntryPoints)).toBe('https://meet.google.com/uvw-xyza-bcd');

    const eventWithoutMeet = {
      summary: 'General sync',
    };
    expect(extractMeetUrl(eventWithoutMeet)).toBeNull();
  });

  it('3. Accurately reads conference status codes (pending, success, failure)', () => {
    expect(getConferenceStatusCode({
      conferenceData: { createRequest: { status: { statusCode: 'pending' } } },
    })).toBe('pending');

    expect(getConferenceStatusCode({
      conferenceData: { createRequest: { status: { statusCode: 'success' } } },
    })).toBe('success');

    expect(getConferenceStatusCode({
      conferenceData: { createRequest: { status: { statusCode: 'failure' } } },
    })).toBe('failure');

    expect(getConferenceStatusCode({})).toBeNull();
  });

  it('4. Polls pending conference provisioning and recovers confirmed link without duplicate events', async () => {
    let callCount = 0;
    const mockCalendar = {
      events: {
        get: vi.fn(async ({ eventId }) => {
          callCount++;
          if (callCount < 2) {
            return {
              data: {
                id: eventId,
                conferenceData: {
                  createRequest: { status: { statusCode: 'pending' } },
                },
              },
            };
          }
          return {
            data: {
              id: eventId,
              hangoutLink: 'https://meet.google.com/pol-ledr-oom',
              conferenceData: {
                createRequest: { status: { statusCode: 'success' } },
                entryPoints: [{ entryPointType: 'video', uri: 'https://meet.google.com/pol-ledr-oom' }],
              },
            },
          };
        }),
      },
    };

    const result = await pollConferenceProvisioning(mockCalendar, 'event-test-poll-123', 3, 50);
    expect(result.meetUrl).toBe('https://meet.google.com/pol-ledr-oom');
    expect(callCount).toBe(2);
    expect(mockCalendar.events.get).toHaveBeenCalledWith(expect.objectContaining({
      eventId: 'event-test-poll-123',
      conferenceDataVersion: 1,
    }));
  });

  it('5. Immediate Calendar event ID storage and recovery of pending conferences', async () => {
    const mockCalendar = {
      events: {
        insert: vi.fn(async () => ({
          data: {
            id: 'cal-event-998877',
            conferenceData: {
              createRequest: { status: { statusCode: 'pending' } },
            },
          },
        })),
        get: vi.fn(async () => ({
          data: {
            id: 'cal-event-998877',
            hangoutLink: 'https://meet.google.com/rec-over-lnk',
            conferenceData: {
              createRequest: { status: { statusCode: 'success' } },
            },
          },
        })),
      },
    };

    const meetUrl = await createRealMeetLink(
      testCandidate.fullName,
      testCandidate.email,
      '2026-11-10T10:00:00Z',
      {
        candidateId: testCandidate.id,
        calendar: mockCalendar,
        maxRetries: 2,
        delayMs: 50,
      }
    );

    expect(meetUrl).toBe('https://meet.google.com/rec-over-lnk');

    // Verify DB candidate record was updated with event ID, READY status, and interviewDate
    const updated = await prisma.candidate.findUnique({ where: { id: testCandidate.id } });
    expect(updated.googleCalendarEventId).toBe('cal-event-998877');
    expect(updated.googleMeetStatus).toBe(MEET_STATUS.READY);
    expect(updated.googleMeetUrl).toBe('https://meet.google.com/rec-over-lnk');
    expect(updated.interviewDate).toContain('2026-11-10');
  });

  it('6. Reuses existing verified meeting if valid', async () => {
    // Set candidate as READY with eventId
    await prisma.candidate.update({
      where: { id: testCandidate.id },
      data: {
        googleCalendarEventId: 'existing-event-111',
        googleMeetUrl: 'https://meet.google.com/exi-stin-grm',
        googleMeetStatus: MEET_STATUS.READY,
      },
    });

    const mockCalendar = {
      events: {
        get: vi.fn(async () => ({
          data: {
            id: 'existing-event-111',
            status: 'confirmed',
            hangoutLink: 'https://meet.google.com/exi-stin-grm',
          },
        })),
        insert: vi.fn(),
      },
    };

    const reusedLink = await getOrCreateCandidateMeetLink(
      testCandidate,
      '2026-11-10',
      { calendar: mockCalendar }
    );

    expect(reusedLink).toBe('https://meet.google.com/exi-stin-grm');
    expect(mockCalendar.events.insert).not.toHaveBeenCalled();
  });

  it('7. Safely replaces invalid or cancelled meetings and updates all tasks', async () => {
    // Setup candidate with cancelled/broken meeting
    await prisma.candidate.update({
      where: { id: testCandidate.id },
      data: {
        googleCalendarEventId: 'cancelled-event-000',
        googleMeetUrl: 'https://meet.google.com/old-canc-eld',
        googleMeetStatus: MEET_STATUS.READY,
      },
    });

    // Create a task assignment pointing to old link
    const task = await prisma.taskAssignment.create({
      data: {
        candidateId: testCandidate.id,
        title: 'Sprint 1 Tasks',
        description: 'Initial Deliverables',
        role: testCandidate.role,
        explanationDate: '10.11.26',
        explanationTime: '11:00 AM IST',
        meetLink: 'https://meet.google.com/old-canc-eld',
        reviewDate: '12.11.26',
        reviewTime: '03:00 PM IST',
      },
    });

    const mockCalendar = {
      events: {
        get: vi.fn(async () => ({
          data: {
            id: 'cancelled-event-000',
            status: 'cancelled', // Event cancelled!
          },
        })),
        delete: vi.fn(async () => ({})),
        insert: vi.fn(async () => ({
          data: {
            id: 'new-replacement-event-222',
            hangoutLink: 'https://meet.google.com/new-repl-aced',
            conferenceData: {
              createRequest: { status: { statusCode: 'success' } },
            },
          },
        })),
      },
    };

    const newLink = await getOrCreateCandidateMeetLink(
      testCandidate,
      '2026-11-12',
      { calendar: mockCalendar, delayMs: 10 }
    );

    expect(newLink).toBe('https://meet.google.com/new-repl-aced');
    expect(mockCalendar.events.insert).toHaveBeenCalledTimes(1);

    // Verify task assignment record was updated with the new link
    const updatedTask = await prisma.taskAssignment.findUnique({ where: { id: task.id } });
    expect(updatedTask.meetLink).toBe('https://meet.google.com/new-repl-aced');

    // Verify candidate was updated
    const updatedCand = await prisma.candidate.findUnique({ where: { id: testCandidate.id } });
    expect(updatedCand.googleCalendarEventId).toBe('new-replacement-event-222');
    expect(updatedCand.googleMeetUrl).toBe('https://meet.google.com/new-repl-aced');
    expect(updatedCand.googleMeetStatus).toBe(MEET_STATUS.READY);
  });

  it('8. Concurrency deduplication: simultaneous calls await single insertion', async () => {
    let insertCalls = 0;
    const mockCalendar = {
      events: {
        insert: vi.fn(async () => {
          insertCalls++;
          await new Promise((r) => setTimeout(r, 100)); // simulate latency
          return {
            data: {
              id: 'concurrent-evt-333',
              hangoutLink: 'https://meet.google.com/con-curr-sync',
              conferenceData: {
                createRequest: { status: { statusCode: 'success' } },
              },
            },
          };
        }),
      },
    };

    // Run 3 concurrent requests simultaneously for the same candidate
    const [link1, link2, link3] = await Promise.all([
      getOrCreateCandidateMeetLink(testCandidate, '2026-11-15', { calendar: mockCalendar }),
      getOrCreateCandidateMeetLink(testCandidate, '2026-11-15', { calendar: mockCalendar }),
      getOrCreateCandidateMeetLink(testCandidate, '2026-11-15', { calendar: mockCalendar }),
    ]);

    expect(link1).toBe('https://meet.google.com/con-curr-sync');
    expect(link2).toBe('https://meet.google.com/con-curr-sync');
    expect(link3).toBe('https://meet.google.com/con-curr-sync');
    expect(insertCalls).toBe(1); // Exactly 1 Calendar event created!
  });

  it('9. Throws descriptive error on OAuth expiration / failure and does NOT return fake URLs', async () => {
    const expiredCalendar = {
      events: {
        insert: vi.fn(async () => {
          const err = new Error('invalid_grant: Token has been expired or revoked.');
          err.code = 401;
          throw err;
        }),
      },
    };

    await expect(
      createRealMeetLink('Candidate', 'test@example.com', null, {
        candidateId: testCandidate.id,
        calendar: expiredCalendar,
      })
    ).rejects.toThrow(/Google OAuth token expired or invalid grant/);

    // Verify candidate status was marked REPLACEMENT_REQUIRED
    const cand = await prisma.candidate.findUnique({ where: { id: testCandidate.id } });
    expect(cand.googleMeetStatus).toBe(MEET_STATUS.REPLACEMENT_REQUIRED);
  });
});
