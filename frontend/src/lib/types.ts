/* ── Shared TypeScript types ── */

export interface User {
  _id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  avatar?: string;
  gamesPlayed: number;
  gamesWon: number;
  totalScore: number;
  credits: number;
  mfaEnabled: boolean;
  perGameStats?: {
    doodle: { played: number; won: number };
    hangman: { played: number; won: number };
    tictactoe: { played: number; won: number };
    fruitninja: { played: number; won: number };
  };
  location?: {
    label: string;
    name: string;
    lat: number;
    lon: number;
  } | null;
}

export interface GameHistoryEntry {
  _id: string;
  roomId: string;
  gameType?: string;
  players: { userId: string; username: string; score: number; rank: number }[];
  winner: { userId: string; username: string };
  totalRounds: number;
  createdAt: string;
}

export interface Player {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  isHost: boolean;
  isDrawing?: boolean;
  hasGuessed?: boolean;
  location?: { name: string } | null;
}

export interface ChatMessage {
  id: string;
  player?: string;
  text: string;
  type: 'chat' | 'system' | 'correct' | 'close' | 'hint' | 'round-over';
  timestamp: number;
}

export interface Transaction {
  _id: string;
  merchantOrderId: string;
  credits: number;
  amountPaise: number;
  state: 'INITIATED' | 'COMPLETED' | 'FAILED';
  createdAt: string;
}

export interface LeaderboardEntry {
  id: string;
  username: string;
  avatar?: string;
  score: number;
  roundScore?: number;
}

// Socket message payloads
export interface SocketMessage {
  type: string;
  [key: string]: unknown;
}
