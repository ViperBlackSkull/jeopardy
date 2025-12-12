import { NextResponse } from 'next/server';
import { getTemplates, saveTemplate } from '@/lib/storage';
import { GameTemplate } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  const templates = getTemplates();
  return NextResponse.json(templates);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, categories } = body;

  const template: GameTemplate = {
    id: uuidv4(),
    name: name || 'New Template',
    categories: categories || [],
    createdAt: new Date().toISOString(),
  };

  saveTemplate(template);
  return NextResponse.json(template);
}
