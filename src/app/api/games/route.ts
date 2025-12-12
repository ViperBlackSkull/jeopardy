import { NextResponse } from 'next/server';
import { getGames, saveGame, getTemplate, generateAccessCode } from '@/lib/storage';
import { Game, Category } from '@/types';
import { v4 as uuidv4 } from 'uuid';

const POINT_VALUES = [100, 200, 300, 400, 500];

export async function GET() {
  const games = getGames();
  return NextResponse.json(games);
}

export async function POST(request: Request) {
  const body = await request.json();
  const { name, templateId } = body;

  let categories: Category[] = [];

  if (templateId) {
    const template = getTemplate(templateId);
    if (template) {
      categories = template.categories.map((c) => ({
        ...c,
        id: uuidv4(),
        questions: c.questions.map((q: any) => ({
          ...q,
          id: uuidv4(),
          answered: false,
        })),
      }));
    }
  }

  const game: Game = {
    id: uuidv4(),
    accessCode: generateAccessCode(),
    name: name || 'New Game',
    categories,
    players: [],
    currentQuestion: null,
    currentCategory: null,
    buzzerActive: false,
    buzzerQueue: [],
    phase: 'lobby',
    createdAt: new Date().toISOString(),
    settings: {
      allowNegative: true,
      buzzerLockoutMs: 250,
      showAnswerToAll: true,
      dailyDoubleCount: 1,
    },
  };

  saveGame(game);
  return NextResponse.json(game);
}
