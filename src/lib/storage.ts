import fs from 'fs';
import path from 'path';
import { Game, GameTemplate } from '@/types';

const DATA_DIR = path.join(process.cwd(), 'data');
const GAMES_FILE = path.join(DATA_DIR, 'games.json');
const TEMPLATES_FILE = path.join(DATA_DIR, 'templates.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string, defaultValue: T): T {
  ensureDataDir();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
  }
  return defaultValue;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  ensureDataDir();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// Games
export function getGames(): Game[] {
  return readJsonFile<Game[]>(GAMES_FILE, []);
}

export function getGame(id: string): Game | undefined {
  const games = getGames();
  return games.find(g => g.id === id);
}

export function getGameByAccessCode(code: string): Game | undefined {
  const games = getGames();
  return games.find(g => g.accessCode.toUpperCase() === code.toUpperCase());
}

export function saveGame(game: Game): void {
  const games = getGames();
  const index = games.findIndex(g => g.id === game.id);
  if (index >= 0) {
    games[index] = game;
  } else {
    games.push(game);
  }
  writeJsonFile(GAMES_FILE, games);
}

export function deleteGame(id: string): void {
  const games = getGames().filter(g => g.id !== id);
  writeJsonFile(GAMES_FILE, games);
}

// Templates
export function getTemplates(): GameTemplate[] {
  return readJsonFile<GameTemplate[]>(TEMPLATES_FILE, []);
}

export function getTemplate(id: string): GameTemplate | undefined {
  const templates = getTemplates();
  return templates.find(t => t.id === id);
}

export function saveTemplate(template: GameTemplate): void {
  const templates = getTemplates();
  const index = templates.findIndex(t => t.id === template.id);
  if (index >= 0) {
    templates[index] = template;
  } else {
    templates.push(template);
  }
  writeJsonFile(TEMPLATES_FILE, templates);
}

export function deleteTemplate(id: string): void {
  const templates = getTemplates().filter(t => t.id !== id);
  writeJsonFile(TEMPLATES_FILE, templates);
}

// Generate unique access code
export function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  // Make sure it's unique
  const existing = getGames();
  if (existing.some(g => g.accessCode === code)) {
    return generateAccessCode();
  }
  return code;
}
