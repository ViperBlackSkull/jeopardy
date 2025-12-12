import { NextResponse } from 'next/server';
import { getTemplate, saveTemplate, deleteTemplate } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const template = getTemplate(params.id);
  if (!template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 });
  }
  return NextResponse.json(template);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const updates = await request.json();
  const updatedTemplate = { ...updates, id: params.id };
  saveTemplate(updatedTemplate);
  return NextResponse.json(updatedTemplate);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  deleteTemplate(params.id);
  return NextResponse.json({ success: true });
}
