/* ── Game Store (Zustand) ── */

import { create } from 'zustand';
import type { Player, ChatMessage, LeaderboardEntry } from '../lib/types';

export type GameType = 'doodle' | 'hangman' | 'tictactoe' | 'fruitninja';

interface ModalState {
  type: 'wordPicker' | 'roundEnd' | 'gameEnd' | null;
  words?: string[];
  word?: string;
  leaderboard?: LeaderboardEntry[];
  winner?: string;
}

interface GameState {
  // Room
  roomId: string | null;
  gameType: GameType | null;
  players: Player[];
  isHost: boolean;

  // Round
  currentRound: number;
  maxRounds: number;
  currentTurn: number;
  totalTurns: number;

  // Timer
  timeLeft: number;
  maxTime: number;

  // Drawing
  amDrawing: boolean;
  wordDisplay: string;

  // Chat
  messages: ChatMessage[];

  // Modal
  modal: ModalState;

  // Connection status
  connectionStatus: 'connected' | 'connecting' | 'disconnected';

  // ── Hangman state ──
  revealedWord: string[];
  wrongGuesses: number;
  maxWrongGuesses: number;
  guessedLetters: string[];

  // ── Tic-Tac-Toe state ──
  tttBoard: string[];
  tttCurrentMark: 'X' | 'O';
  tttPlayerX: string | null;
  tttPlayerO: string | null;
  tttPlayerXName: string;
  tttPlayerOName: string;
  tttWinLine: number[] | null;
  tttRoundResult: 'X' | 'O' | 'draw' | null;
  tttRoundWins: { X: number; O: number };
  tttLastMove: { cell: number; mark: string; player: string } | null;

  // ── Fruit Ninja state ──
  fnScores: Record<string, number>;
  fnLives: Record<string, number>;
  fnRoundWins: Record<string, number>;
  fnSlowmo: Record<string, boolean>;
  fnRoundResult: { scores: Record<string, number>; roundWins: Record<string, number>; winner: string | null } | null;

  // Actions
  setRoom: (roomId: string, players: Player[], isHost: boolean, gameType?: GameType) => void;
  addPlayer: (player: Player) => void;
  removePlayer: (playerId: string) => void;
  setPlayers: (players: Player[]) => void;
  setHost: (isHost: boolean) => void;
  setRound: (round: number, maxRounds: number, turn: number, totalTurns: number) => void;
  updateTimer: (timeLeft: number) => void;
  setMaxTime: (maxTime: number) => void;
  setDrawing: (amDrawing: boolean, word?: string) => void;
  setWordHint: (hint: string) => void;
  addMessage: (msg: ChatMessage) => void;
  clearMessages: () => void;
  showModal: (modal: ModalState) => void;
  hideModal: () => void;
  setConnectionStatus: (status: 'connected' | 'connecting' | 'disconnected') => void;
  setHangmanUpdate: (revealedWord: string[], wrongGuesses: number, guessedLetters: string[], maxWrongGuesses: number) => void;
  setTttUpdate: (board: string[], currentMark: 'X' | 'O', playerX: string, playerO: string, playerXName: string, playerOName: string, lastMove?: { cell: number; mark: string; player: string }) => void;
  setTttRoundResult: (result: 'X' | 'O' | 'draw', winLine: number[] | null, board: string[], roundWins: { X: number; O: number }) => void;
  clearTttRoundResult: () => void;
  setFnStatus: (scores: Record<string, number>, lives: Record<string, number>) => void;
  setFnSlowmo: (player: string, active: boolean) => void;
  setFnRoundResult: (scores: Record<string, number>, roundWins: Record<string, number>, winner: string | null) => void;
  clearFnRoundResult: () => void;
  resetGame: () => void;
  leaveRoom: () => void;
}

let msgCounter = 0;

export function createMsgId() {
  return `msg-${Date.now()}-${msgCounter++}`;
}

const initialGameState = {
  roomId: null as string | null,
  gameType: null as GameType | null,
  players: [] as Player[],
  isHost: false,
  currentRound: 0,
  maxRounds: 0,
  currentTurn: 0,
  totalTurns: 0,
  timeLeft: 0,
  maxTime: 60,
  amDrawing: false,
  wordDisplay: '',
  messages: [] as ChatMessage[],
  modal: { type: null } as ModalState,
  connectionStatus: 'disconnected' as const,
  // Hangman
  revealedWord: [] as string[],
  wrongGuesses: 0,
  maxWrongGuesses: 6,
  guessedLetters: [] as string[],
  // Tic-Tac-Toe
  tttBoard: Array(9).fill('') as string[],
  tttCurrentMark: 'X' as const,
  tttPlayerX: null as string | null,
  tttPlayerO: null as string | null,
  tttPlayerXName: '',
  tttPlayerOName: '',
  tttWinLine: null as number[] | null,
  tttRoundResult: null as 'X' | 'O' | 'draw' | null,
  tttRoundWins: { X: 0, O: 0 },
  tttLastMove: null as { cell: number; mark: string; player: string } | null,
  // Fruit Ninja
  fnScores: {} as Record<string, number>,
  fnLives: {} as Record<string, number>,
  fnRoundWins: {} as Record<string, number>,
  fnSlowmo: {} as Record<string, boolean>,
  fnRoundResult: null as { scores: Record<string, number>; roundWins: Record<string, number>; winner: string | null } | null,
};

export const useGameStore = create<GameState>((set) => ({
  ...initialGameState,

  setRoom: (roomId, players, isHost, gameType) =>
    set({ roomId, players, isHost, gameType: gameType ?? null }),

  addPlayer: (player) =>
    set((s) => ({ players: [...s.players, player] })),

  removePlayer: (playerId) =>
    set((s) => ({ players: s.players.filter(p => p.id !== playerId) })),

  setPlayers: (players) =>
    set({ players }),

  setHost: (isHost) =>
    set({ isHost }),

  setRound: (currentRound, maxRounds, currentTurn, totalTurns) =>
    set({ currentRound, maxRounds, currentTurn, totalTurns }),

  updateTimer: (timeLeft) =>
    set({ timeLeft }),

  setMaxTime: (maxTime) =>
    set({ maxTime }),

  setDrawing: (amDrawing, word) =>
    set({ amDrawing, wordDisplay: word ?? '' }),

  setWordHint: (hint) =>
    set({ wordDisplay: hint }),

  addMessage: (msg) =>
    set((s) => ({ messages: [...s.messages, msg] })),

  clearMessages: () =>
    set({ messages: [] }),

  showModal: (modal) =>
    set({ modal }),

  hideModal: () =>
    set({ modal: { type: null } }),

  setConnectionStatus: (connectionStatus) =>
    set({ connectionStatus }),

  setHangmanUpdate: (revealedWord, wrongGuesses, guessedLetters, maxWrongGuesses) =>
    set({ revealedWord, wrongGuesses, guessedLetters, maxWrongGuesses }),

  setTttUpdate: (tttBoard, tttCurrentMark, tttPlayerX, tttPlayerO, tttPlayerXName, tttPlayerOName, tttLastMove) =>
    set({ tttBoard, tttCurrentMark, tttPlayerX, tttPlayerO, tttPlayerXName, tttPlayerOName, tttLastMove: tttLastMove ?? null, tttWinLine: null, tttRoundResult: null }),

  setTttRoundResult: (tttRoundResult, tttWinLine, tttBoard, tttRoundWins) =>
    set({ tttRoundResult, tttWinLine, tttBoard, tttRoundWins }),

  clearTttRoundResult: () =>
    set({ tttRoundResult: null, tttWinLine: null }),

  setFnStatus: (fnScores, fnLives) =>
    set({ fnScores, fnLives }),

  setFnSlowmo: (player, active) =>
    set((s) => ({ fnSlowmo: { ...s.fnSlowmo, [player]: active } })),

  setFnRoundResult: (scores, roundWins, winner) =>
    set({ fnRoundResult: { scores, roundWins, winner } }),

  clearFnRoundResult: () =>
    set({ fnRoundResult: null }),

  resetGame: () =>
    set({
      currentRound: 0,
      maxRounds: 0,
      currentTurn: 0,
      totalTurns: 0,
      timeLeft: 0,
      amDrawing: false,
      wordDisplay: '',
      messages: [],
      modal: { type: null },
      revealedWord: [],
      wrongGuesses: 0,
      maxWrongGuesses: 6,
      guessedLetters: [],
      tttBoard: Array(9).fill(''),
      tttCurrentMark: 'X' as const,
      tttPlayerX: null,
      tttPlayerO: null,
      tttPlayerXName: '',
      tttPlayerOName: '',
      tttWinLine: null,
      tttRoundResult: null,
      tttRoundWins: { X: 0, O: 0 },
      tttLastMove: null,
      fnScores: {},
      fnLives: {},
      fnRoundWins: {},
      fnSlowmo: {},
      fnRoundResult: null,
    }),

  leaveRoom: () =>
    set({ ...initialGameState }),
}));
