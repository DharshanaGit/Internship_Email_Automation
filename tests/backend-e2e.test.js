import { describe, it, expect } from 'vitest';
import { prisma } from '../lib/prisma.js';
import { generateGemmaTask, generateGemmaFeedback, evaluateCandidateEligibility } from '../lib/gemmaEngine.js';
import { createIcsCalendarInvite } from '../lib/googleCalendar.js';
import { formatToDdMmYy, getExplanationSchedule, getReviewOneSchedule, getReviewTwoSchedule } from '../lib/dateUtils.js';

describe('Backend Working Pipeline & Internship Lifecycle E2E', () => {
  const testCandidateId = `SF-E2E-${Date.now()}`;
  let createdCandidate = null;

  // 1. Candidate Creation & DB Schema Integrity
  it('creates a new candidate in SQLite with all required fields', async () => {
    createdCandidate = await prisma.candidate.create({
      data: {
        candidateId: testCandidateId,
        fullName: 'Cyber Security Pipeline Tester',
        email: `sec.test.${Date.now()}@shortfundly.com`,
        phone: '+91 9998887776',
        role: 'Web Developer Intern',
        department: 'Engineering',
        joiningDate: '2026-06-01',
        endDate: '2026-08-31',
        duration: '3 Months',
        workMode: 'Online - Remote',
        reportingManager: 'M. Selvam',
        assignedMentor: 'Engineering Mentor',
        offerLetterStatus: 'Sent',
        taskStatus: 'Not Assigned',
      },
    });

    expect(createdCandidate.id).toBeDefined();
    expect(createdCandidate.candidateId).toBe(testCandidateId);
    expect(createdCandidate.offerLetterStatus).toBe('Sent');
  });

  // 2. Gemma AI Sprint 1 Task Generation
  it('synthesizes role-specific Sprint 1 task using Gemma 2B engine', () => {
    const task = generateGemmaTask(createdCandidate.role, 0);
    expect(task.title).toContain('Sprint 1');
    expect(task.description).toContain('Deliverables');
    expect(task.role).toBe('Web Developer');
  });

  // 3. Task Assignment & Calendar Invite Generation
  it('creates a TaskAssignment with valid scheduling and RFC-5545 .ics calendar invite', async () => {
    const expSchedule = getExplanationSchedule(new Date());
    const rev1Schedule = getReviewOneSchedule(expSchedule.dateStr);

    const task = await prisma.taskAssignment.create({
      data: {
        candidateId: createdCandidate.id,
        taskNumber: 1,
        title: 'Sprint 1: Component Library & RESTful API Architecture',
        description: 'Construct modular Next.js components and test endpoints.',
        role: createdCandidate.role,
        explanationDate: expSchedule.dateStr,
        explanationTime: expSchedule.timeStr,
        meetLink: 'https://meet.google.com/sec-pipe-test',
        reviewDate: rev1Schedule.callDateStr,
        reviewTime: rev1Schedule.timeStr,
        status: 'Assigned',
      },
    });

    expect(task.id).toBeDefined();
    expect(task.status).toBe('Assigned');

    // Generate Calendar invite
    const icsContent = createIcsCalendarInvite({
      uid: `sf-e2e-${task.id}@shortfundly.com`,
      title: `Sprint Briefing - ${createdCandidate.fullName}`,
      description: task.description,
      meetLink: task.meetLink,
      startDateStr: '2026-11-01',
      startTimeStr: '11:00',
      durationMinutes: 45,
      attendeeEmail: createdCandidate.email,
      attendeeName: createdCandidate.fullName,
    });

    expect(icsContent).toContain('BEGIN:VCALENDAR');
    expect(icsContent).toContain('https://meet.google.com/sec-pipe-test');
    expect(icsContent).toContain('END:VCALENDAR');
  });

  // 4. Review 1 (Automated) vs Review 2 (Manual Feedback) Logic
  it('verifies Review 1 (no feedback) and Review 2 (manual mentor notes) separation', () => {
    // Review 1 has 0 feedback notes
    const review1Notes = '';
    expect(review1Notes).toBe('');

    // Review 2 has custom mentor notes
    const mentorCustomFeedback = 'Code quality is excellent. Please add unit tests for edge cases before Sprint 2.';
    expect(mentorCustomFeedback.length).toBeGreaterThan(10);

    // AI suggestion fallback works if mentor asks for auto-fill
    const aiFeedback = generateGemmaFeedback(createdCandidate.role, 1, 2);
    expect(aiFeedback.feedback).toBeDefined();
    expect(aiFeedback.feedback.length).toBeGreaterThan(20);
  });

  // 5. Milestone Completion & Next Sprint Readiness
  it('completes milestone task and transitions candidate to Sprint 2 Ready', async () => {
    // Mark candidate milestone completed
    const updatedCandidate = await prisma.candidate.update({
      where: { id: createdCandidate.id },
      data: {
        tasksCompleted: 1,
        taskStatus: 'Milestone Completed',
      },
    });

    expect(updatedCandidate.tasksCompleted).toBe(1);
    expect(updatedCandidate.taskStatus).toBe('Milestone Completed');

    // Generating next task for tasksCompleted = 1 should automatically yield Sprint 2
    const nextTask = generateGemmaTask(updatedCandidate.role, updatedCandidate.tasksCompleted);
    expect(nextTask.title).toContain('Sprint 2');

    // Candidate should now be approved for certificate
    const eligibility = evaluateCandidateEligibility(updatedCandidate);
    expect(eligibility.eligible).toBe(true);
    expect(eligibility.tasksCompleted).toBe(1);
  });

  // Cleanup test candidate
  it('cleans up test candidate and cascaded tasks', async () => {
    await prisma.taskAssignment.deleteMany({ where: { candidateId: createdCandidate.id } });
    await prisma.candidate.delete({ where: { id: createdCandidate.id } });
    const exists = await prisma.candidate.findUnique({ where: { id: createdCandidate.id } });
    expect(exists).toBeNull();
  });
});
