import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DEFAULT_OFFER_EMAIL_BODY, DEFAULT_OFFER_EMAIL_SUBJECT } from '@/lib/offerService';
import { corporateOfferTemplateSource } from '@/lib/pdfEngine';
import { normalizeToJinjaPlainText } from '@/lib/jinjaEngine';

export async function GET(request) {
  try {
    const templates = await prisma.offerTemplate.findMany({
      orderBy: { createdAt: 'desc' },
    });

    if (templates.length === 0) {
      // Create initial default template if none exist
      const defaultTmpl = await prisma.offerTemplate.create({
        data: {
          name: 'Default Corporate Offer Letter',
          subject: DEFAULT_OFFER_EMAIL_SUBJECT,
          emailBody: DEFAULT_OFFER_EMAIL_BODY,
          pdfTemplate: corporateOfferTemplateSource,
          isDefault: true,
        },
      });
      return NextResponse.json({ success: true, templates: [defaultTmpl] });
    }

    // Ensure all templates return clean plain-text Jinja format (no raw HTML in emailBody)
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
    const body = await request.json();
    const { name, subject, emailBody, pdfTemplate, isDefault } = body;

    if (!name || !subject || !emailBody || !pdfTemplate) {
      return NextResponse.json({ success: false, error: 'All fields (name, subject, emailBody, pdfTemplate) are required.' }, { status: 400 });
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
        emailBody,
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
    const body = await request.json();
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

    const template = await prisma.offerTemplate.update({
      where: { id },
      data: {
        ...(name ? { name } : {}),
        ...(subject ? { subject } : {}),
        ...(emailBody ? { emailBody } : {}),
        ...(pdfTemplate ? { pdfTemplate } : {}),
        ...(isDefault !== undefined ? { isDefault: Boolean(isDefault) } : {}),
      },
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
