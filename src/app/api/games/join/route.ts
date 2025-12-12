import { NextResponse } from 'next/server';
import { getGameByAccessCode } from '@/lib/storage';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Access code required' }, { status: 400 });
  }

  const game = getGameByAccessCode(code);

  if (!game) {
    return NextResponse.json({ error: 'Game not found' }, { status: 404 });
  }

  if (game.phase === 'finished') {
    return NextResponse.json({ error: 'Game has ended' }, { status: 400 });
  }

  return NextResponse.json({ gameId: game.id });
}
