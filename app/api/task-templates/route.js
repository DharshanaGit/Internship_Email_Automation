export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma.js';
import { seedGemmaTaskTemplates } from '@/lib/gemmaService.js';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level');
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    // Ensure templates exist
    const count = await prisma.taskTemplate.count();
    if (count === 0) {
      await seedGemmaTaskTemplates(prisma);
    }

    const where = {};
    if (level && level !== 'ALL') {
      where.level = level;
    }
    if (role && role !== 'ALL') {
      where.role = { contains: role, mode: 'insensitive' };
    }
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { taskId: { contains: search, mode: 'insensitive' } },
        { techStack: { contains: search, mode: 'insensitive' } },
      ];
    }

    const templates = await prisma.taskTemplate.findMany({
      where,
      orderBy: [{ level: 'asc' }, { taskId: 'asc' }],
    });

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error('Error fetching task templates:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { taskId, title, level, role, objective, modules, expectedOutput, techStack, jinjaBody } = body;

    if (!title || !role || !objective) {
      return NextResponse.json({ success: false, error: 'Title, Role, and Objective are required.' }, { status: 400 });
    }

    const finalTaskId = taskId || `TSK-CUSTOM-${Date.now().toString().slice(-4)}`;

    const template = await prisma.taskTemplate.create({
      data: {
        taskId: finalTaskId,
        title,
        level: level || 'DEVELOPER',
        role,
        objective,
        modules: modules || '',
        expectedOutput: expectedOutput || '',
        techStack: techStack || 'React, Node.js',
        jinjaBody: jinjaBody || '',
        isGemmaGenerated: false,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error creating task template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { id, title, level, role, objective, modules, expectedOutput, techStack, jinjaBody } = body;

    if (!id) {
      return NextResponse.json({ success: false, error: 'Template ID is required.' }, { status: 400 });
    }

    const template = await prisma.taskTemplate.update({
      where: { id },
      data: {
        title,
        level,
        role,
        objective,
        modules,
        expectedOutput,
        techStack,
        jinjaBody,
      },
    });

    return NextResponse.json({ success: true, template });
  } catch (error) {
    console.error('Error updating task template:', error);
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

    await prisma.taskTemplate.delete({
      where: { id },
    });

    return NextResponse.json({ success: true, message: 'Template deleted.' });
  } catch (error) {
    console.error('Error deleting task template:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
