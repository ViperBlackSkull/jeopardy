export interface MediaAttachment {
  type: 'image' | 'audio' | 'video';
  url: string;
  filename: string;
}

export interface Question {
  id: string;
  question: string;
  answer: string;
  points: number;
  answered: boolean;
  dailyDouble?: boolean;
  media?: MediaAttachment;
  answerMedia?: MediaAttachment;
}

export interface Category {
  id: string;
  name: string;
  questions: Question[];
}

export interface Player {
  id: string;
  name: string;
  score: number;
  buzzerTime?: number;
  connected: boolean;
}

export interface BuzzerEvent {
  playerId: string;
  playerName: string;
  timestamp: number;
  order: number;
}

export interface Game {
  id: string;
  accessCode: string;
  name: string;
  categories: Category[];
  players: Player[];
  currentQuestion: Question | null;
  currentCategory: Category | null;
  buzzerActive: boolean;
  buzzerQueue: BuzzerEvent[];
  phase: 'lobby' | 'playing' | 'question' | 'answer' | 'finished';
  createdAt: string;
  settings: GameSettings;
}

export interface GameSettings {
  allowNegative: boolean;
  buzzerLockoutMs: number;
  showAnswerToAll: boolean;
  dailyDoubleCount: number;
}

export interface GameTemplate {
  id: string;
  name: string;
  categories: Omit<Category, 'id'>[];
  createdAt: string;
}

export type WebSocketMessage =
  | { type: 'join'; gameId: string; playerName: string }
  | { type: 'buzz'; gameId: string; playerId: string }
  | { type: 'game-update'; game: Game }
  | { type: 'buzzer-result'; queue: BuzzerEvent[] }
  | { type: 'player-joined'; player: Player }
  | { type: 'player-left'; playerId: string }
  | { type: 'error'; message: string }
  | { type: 'connected'; playerId: string };
