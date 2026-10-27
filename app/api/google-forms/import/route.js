import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { generateUniqueInternId } from '@/lib/offerService';

export async function POST(request) {
  try {
    const { candidates = [], batchId } = await request.json();

    if (!Array.isArray(candidates) || candidates.length === 0) {
      return NextResponse.json({ success: false, error: 'No candidates provided for import.' }, { status: 400 });
    }

    const batch = batchId ? await prisma.internshipBatch.findUnique({ where: { id: batchId } }) : null;

    let importedCount = 0;
    let updatedCount = 0;
    const importedCandidates = [];

    for (const cand of candidates) {
      if (!cand.email || !cand.fullName) continue;

      // Authoritative HR values
      const joiningDate = batch?.joiningDate || cand.joiningDate || '2026-06-01';
      const endDate = batch?.endDate || cand.endDate || '2026-08-31';
      const duration = batch?.duration || cand.duration || '3 Months';
      const stipend = batch?.stipend || cand.stipend || 'Rs. 10,000';
      const batchName = batch?.batchName || cand.batch || 'Batch A';

      // Check for existing candidate
      const existing = await prisma.candidate.findFirst({
        where: {
          OR: [
            { email: cand.email.toLowerCase() },
            ...(cand.googleResponseId ? [{ googleResponseId: cand.googleResponseId }] : []),
          ],
        },
      });

      if (existing) {
        // Protect already-sent or accepted offer letters from silent changes
        const isLocked = ['Sent', 'Accepted', 'Rejected'].includes(existing.offerLetterStatus);

        if (!isLocked) {
          const updated = await prisma.candidate.update({
            where: { id: existing.id },
            data: {
              fullName: cand.fullName,
              phone: cand.phone || existing.phone,
              role: cand.role || existing.role,
              department: cand.department || existing.department || 'Engineering',
              collegeName: cand.collegeName || existing.collegeName,
              degree: cand.degree || existing.degree,
              joiningDate,
              endDate,
              duration,
              stipend,
              batch: batchName,
              batchId: batch?.id || existing.batchId,
              googleResponseId: cand.googleResponseId || existing.googleResponseId,
              offerDeadline: batch?.commonDeadline || existing.offerDeadline,
            },
          });
          importedCandidates.push(updated);
          updatedCount++;
        } else {
          importedCandidates.push(existing);
        }
      } else {
        // Create new candidate with permanent unique intern ID
        const internId = cand.internId || (await generateUniqueInternId());
        const candidateId = cand.candidateId || `SF-INT-2026-${Math.floor(1000 + Math.random() * 9000)}`;

        const created = await prisma.candidate.create({
          data: {
            candidateId,
            internId,
            fullName: cand.fullName,
            email: cand.email.toLowerCase(),
            phone: cand.phone || null,
            role: cand.role || 'Web Developer Intern',
            department: cand.department || 'Engineering',
            collegeName: cand.collegeName || 'Recognized University',
            degree: cand.degree || 'Bachelor of Engineering',
            joiningDate,
            endDate,
            duration,
            stipend,
            batch: batchName,
            batchId: batch?.id || null,
            googleResponseId: cand.googleResponseId || null,
            offerLetterStatus: 'Ready to Send',
            offerDeliveryStatus: 'Not Sent',
            offerDeadline: batch?.commonDeadline || null,
          },
        });
        importedCandidates.push(created);
        importedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Successfully imported ${importedCount} new candidates and refreshed ${updatedCount} candidates.`,
      importedCount,
      updatedCount,
      totalProcessed: importedCandidates.length,
      candidates: importedCandidates,
    });
  } catch (error) {
    console.error('Google form import error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
