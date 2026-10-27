import { NextResponse } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma.js';
import { generateOfferLetterPdf } from '@/lib/pdfEngine.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return new Response('Token is required', { status: 400 });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { offerAcceptanceToken: token },
          { offerAcceptanceTokenHash: tokenHash },
          { id: token },
        ],
      },
    });

    if (!candidate) {
      return new Response('Invalid or expired offer token', { status: 404 });
    }

    let pdfBuffer = null;

    if (candidate.offerPdfPath && fs.existsSync(candidate.offerPdfPath)) {
      pdfBuffer = fs.readFileSync(candidate.offerPdfPath);
    } else {
      // Re-generate if file missing on disk
      const generated = await generateOfferLetterPdf(candidate);
      pdfBuffer = generated.pdfBuffer;
    }

    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="Offer_Letter_${(candidate.fullName || 'Candidate').replace(/\s+/g, '_')}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error serving offer letter PDF:', error);
    return new Response('Error loading offer PDF', { status: 500 });
  }
}
