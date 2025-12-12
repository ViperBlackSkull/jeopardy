import { NextResponse } from 'next/server';
import { getGame, saveGame, deleteGame } from '@/lib/storage';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const game = getGame(params.id);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }
  return NextResponse.json(game);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const game = getGame(params.id);
  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  const updates = await request.json();
  const updatedGame = { ...game, ...updates, id: params.id };
  saveGame(updatedGame);
  return NextResponse.json(updatedGame);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  deleteGame(params.id);
  return NextResponse.json({ success: true });
}
