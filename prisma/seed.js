import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database users and roles...');

  const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  // 1. System Administrator
  const adminEmail = process.env.ADMIN_EMAIL || process.env.DEFAULT_ADMIN_EMAIL || 'admin@shortfundly.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      passwordHash: passwordHash,
      name: 'System Administrator',
      role: 'ADMIN',
    },
    create: {
      email: adminEmail,
      passwordHash: passwordHash,
      name: 'System Administrator',
      role: 'ADMIN',
    },
  });
  console.log('Admin user initialized:', admin.email, 'Role:', admin.role);

  // 2. HR Director
  const hrEmail = process.env.HR_EMAIL || 'hr@shortfundly.com';
  const hr = await prisma.user.upsert({
    where: { email: hrEmail },
    update: {
      passwordHash: passwordHash,
      name: 'HR Director',
      role: 'HR',
    },
    create: {
      email: hrEmail,
      passwordHash: passwordHash,
      name: 'HR Director',
      role: 'HR',
    },
  });
  console.log('HR user initialized:', hr.email, 'Role:', hr.role);

  // 3. CEO & Founder
  const ceoEmail = process.env.CEO_EMAIL || 'ceo@shortfundly.com';
  const ceo = await prisma.user.upsert({
    where: { email: ceoEmail },
    update: {
      passwordHash: passwordHash,
      name: 'M. Selvam (Founder & CEO)',
      role: 'CEO',
    },
    create: {
      email: ceoEmail,
      passwordHash: passwordHash,
      name: 'M. Selvam (Founder & CEO)',
      role: 'CEO',
    },
  });
  console.log('CEO user initialized:', ceo.email, 'Role:', ceo.role);

  // System Settings default
  await prisma.systemSetting.upsert({
    where: { id: 'default' },
    update: {},
    create: {
      id: 'default',
      smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
      smtpPort: parseInt(process.env.SMTP_PORT || '465', 10),
      smtpSecure: true,
      smtpUser: process.env.SMTP_USER || 'admin@shortfundly.com',
      smtpPass: process.env.SMTP_PASS || '',
      senderEmail: 'hr@shortfundly.com',
      senderName: process.env.SMTP_SENDER_NAME || 'Shortfundly Media Technologies',
      googleCalendarConnected: true,
      defaultMeetLinkPrefix: 'https://meet.google.com',
      simulationMode: true,
    },
  });

  console.log('Database seeding finished successfully.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
