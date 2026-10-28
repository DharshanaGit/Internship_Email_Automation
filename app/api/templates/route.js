export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_OFFER_EMAIL_BODY, DEFAULT_OFFER_EMAIL_SUBJECT } from '@/lib/offerService';
import { corporateOfferTemplateSource } from '@/lib/pdfEngine';
import { normalizeToJinjaPlainText } from '@/lib/jinjaEngine';

const FAST_TRACK_EMAIL_BODY = `Dear {{candidateName}},

Congratulations! Following your outstanding technical evaluation, we are thrilled to offer you the position of {{role}} at Shortfundly under our **Fast-Track Engineering Program**.

Internship Logistics & Structure:
• Position / Designation: {{role}}
• Intern ID: {{internId}}
• Start Date: {{startDate}}
• Duration: {{duration}}
• Monthly Compensation: {{stipend}}
• Work Mode: Online - Remote Engineering Track

Action Required: Review & Sign
To review your formal corporate offer letter PDF and execute your digital signature, please access your secure portal using the link below:

👉 Access Your Secure Offer Portal & Sign Offer:
{{responseUrl}}

Important Note on Expiration: This offer and unique access link will officially expire on {{deadline}}. Please ensure you complete your response before this timestamp.

Next Steps:
1. Open the secure candidate portal link above.
2. Review the formal terms and conditions.
3. Submit your digital signature and upload a photo of your signature.
4. Upon confirmation, onboarding orientation instructions will be delivered directly to your inbox.

We are excited to build cutting-edge systems together!

Best regards,
Talent Acquisition & Engineering Operations
Shortfundly Media Technologies Pvt. Ltd.
www.shortfundly.com`;

export async function GET() {
  try {
    let templates = await prisma.offerTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    // Ensure at least two default templates exist
    if (templates.length === 0) {
      const defaultTmpl1 = await prisma.offerTemplate.create({
        data: {
          name: 'Corporate Standard Offer Letter',
          subject: DEFAULT_OFFER_EMAIL_SUBJECT,
          emailBody: normalizeToJinjaPlainText(DEFAULT_OFFER_EMAIL_BODY),
          pdfTemplate: corporateOfferTemplateSource,
          isDefault: true,
        },
      });

      const defaultTmpl2 = await prisma.offerTemplate.create({
        data: {
          name: 'Fast-Track Technical Internship Offer',
          subject: 'Fast-Track Technical Internship Offer Letter | Shortfundly - {{candidateName}}',
          emailBody: normalizeToJinjaPlainText(FAST_TRACK_EMAIL_BODY),
          pdfTemplate: corporateOfferTemplateSource,
          isDefault: false,
        },
      });

      templates = [defaultTmpl1, defaultTmpl2];
    } else if (templates.length === 1) {
      const defaultTmpl2 = await prisma.offerTemplate.create({
        data: {
          name: 'Fast-Track Technical Internship Offer',
          subject: 'Fast-Track Technical Internship Offer Letter | Shortfundly - {{candidateName}}',
          emailBody: normalizeToJinjaPlainText(FAST_TRACK_EMAIL_BODY),
          pdfTemplate: corporateOfferTemplateSource,
          isDefault: false,
        },
      });
      templates.push(defaultTmpl2);
    }

    // Ensure all templates return clean plain-text Jinja format
    const sanitizedTemplates = templates.map((tmpl) => {
      if (tmpl.emailBody && (tmpl.emailBody.includes('<p>') || tmpl.emailBody.includes('<div>'))) {
        return {
          ...tmpl,
          emailBody: normalizeToJinjaPlainText(tmpl.emailBody),
        };
      }
      return tmpl;
    });

    return NextResponse.json({ success: true, templates: sanitizedTemplates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    let { name, subject, emailBody, pdfTemplate, isDefault } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Template name is required.' }, { status: 400 });
    }

    name = name.trim();
    subject = subject?.trim() || DEFAULT_OFFER_EMAIL_SUBJECT;
    emailBody = emailBody?.trim() || normalizeToJinjaPlainText(DEFAULT_OFFER_EMAIL_BODY);
    pdfTemplate = pdfTemplate?.trim() || corporateOfferTemplateSource;

    // Check if name already exists
    const existing = await prisma.offerTemplate.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: `A template named "${name}" already exists. Please choose a different name.` },
        { status: 409 }
      );
    }

    if (isDefault) {
      await prisma.offerTemplate.updateMany({
        data: { isDefault: false },
      });
    }

    const template = await prisma.offerTemplate.create({
      data: {
        name,
        subject,
        emailBody: normalizeToJinjaPlainText(emailBody),
        pdfTemplate,
        isDefault: Boolean(isDefault),
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { id, name, subject, emailBody, pdfTemplate, isDefault } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required.' }, { status: 400 });
    }

    if (isDefault) {
      await prisma.offerTemplate.updateMany({
        where: { id: { not: id } },
        data: { isDefault: false },
      });
    }

    const updateData = {};
    if (name) updateData.name = name.trim();
    if (subject) updateData.subject = subject.trim();
    if (emailBody) updateData.emailBody = normalizeToJinjaPlainText(emailBody);
    if (pdfTemplate) updateData.pdfTemplate = pdfTemplate.trim();
    if (isDefault !== undefined) updateData.isDefault = Boolean(isDefault);

    const template = await prisma.offerTemplate.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error updating template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required.' }, { status: 400 });
    }

    await prisma.offerTemplate.delete({ where: { id } });
    return NextResponse.json({ success: true, message: 'Template deleted successfully.' });
  } catch (error) {
    console.error('Error deleting template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
