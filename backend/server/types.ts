// ============================================
// Scribble Clone — Shared Types
// ============================================

export type GameType = "doodle" | "hangman" | "tictactoe" | "fruitninja";

export interface Player {
    socketId: string;
    authUserId: string;       // MongoDB User._id
    email: string;
    username: string;          // display name from profile
    avatar: string | null;
    location: { lat: number; lon: number; name: string } | null;
    roomId: string | null;
    score: number;
    hasGuessed: boolean;
    isDrawing: boolean;        // in hangman: "word setter"
    canGuess: boolean;
    lastGuessTime: number;
}

export type RoomPhase =
    | "waiting"
    | "picking"
    | "drawing"
    | "round_end"
    | "game_end";

export interface Room {
    roomId: string;
    gameType: GameType;
    hostId: string;
    players: string[]; // socketIds
    currentRound: number;
    totalRounds: number;
    currentDrawerIndex: number;
    word: string | null;
    phase: RoomPhase;
    timer: ReturnType<typeof setTimeout> | null;
    timerInterval: ReturnType<typeof setInterval> | null;
    timeLeft: number;
    maxPlayers: number;
    drawOrder: string[]; // socketIds in drawing order for the round
    roundDrawnCount: number; // how many players have drawn this round

    // ── Hangman-specific ──
    guessedLetters: string[];
    wrongGuesses: number;
    maxWrongGuesses: number;
    revealedWord: boolean[]; // per-character mask

    // ── Tic-Tac-Toe-specific ──
    tttBoard: string[];           // 9 cells: "" | "X" | "O"
    tttPlayerX: string | null;    // socketId of X player
    tttPlayerO: string | null;    // socketId of O player
    tttCurrentMark: "X" | "O";
    tttRoundWins: { X: number; O: number }; // best-of-5 tracking

    // ── Fruit Ninja-specific ──
    fnScores: Record<string, number>;       // per-player score this round
    fnLives: Record<string, number>;        // per-player lives this round
    fnRoundWins: Record<string, number>;    // best-of-3 series wins
    fnCubes: FnCube[];                      // active cubes on server
    fnCubeIdCounter: number;
    fnSpawnTimer: ReturnType<typeof setInterval> | null;
    fnSlowmo: Record<string, number>;       // remaining slowmo ms per player
}

export const GAME_CONFIG = {
    maxPlayers: 8,
    roundTime: 60,
    pickTime: 30,
    roundEndDelay: 5,
    totalRounds: 3,
    wordChoices: 3,
    minPlayers: 2,
    guessRateLimitMs: 500,
} as const;

export const HANGMAN_CONFIG = {
    maxPlayers: 8,
    roundTime: 90,
    pickTime: 30,
    roundEndDelay: 5,
    totalRounds: 3,
    wordChoices: 3,
    minPlayers: 2,
    maxWrongGuesses: 6,
    guessRateLimitMs: 300,
} as const;

export const TICTACTOE_CONFIG = {
    maxPlayers: 2,
    minPlayers: 2,
    turnTime: 15,
    roundEndDelay: 5,
    totalRounds: 5,       // best of 5
    winsNeeded: 3,        // first to 3
} as const;

export const FRUITNINJA_CONFIG = {
    maxPlayers: 2,
    minPlayers: 2,
    roundTime: 60,
    roundEndDelay: 5,
    totalRounds: 3,       // best of 3
    winsNeeded: 2,        // first to 2
    maxLives: 3,
    spawnIntervalMs: 1200,
    spawnIntervalMinMs: 600,
} as const;

export interface FnCube {
    id: number;
    targetPlayer: string;   // socketId of the player this cube belongs to
    x: number;              // normalised 0-1 horizontal spawn
    y: number;              // starts at 1 (bottom)
    xD: number;             // horizontal velocity
    yD: number;             // upward velocity (negative = up)
    color: string;          // "blue" | "green" | "pink" | "orange"
    health: number;
    wireframe: boolean;
    spawnedAt: number;
}

// ============================================
// WebSocket Message Types
// ============================================

// Client → Server
export type ClientMessage =
    | { type: "create_room"; gameType?: GameType }
    | { type: "join_room"; roomId: string }
    | { type: "leave_room" }
    | { type: "start_game" }
    | { type: "select_word"; word: string }
    | { type: "draw"; x: number; y: number; color: string; strokeWidth: number; drawType: "start" | "draw" | "end" }
    | { type: "clear_canvas" }
    | { type: "guess"; text: string }
    | { type: "guess_letter"; letter: string }
    | { type: "ttt_move"; cell: number }
    | { type: "fn_slice"; cubeId: number }
    | { type: "fn_miss"; cubeId: number }
    | { type: "play_again" };

// Server → Client
export type ServerMessage =
    | { type: "connected"; socketId: string; username: string; avatar: string | null }
    | { type: "room_created"; roomId: string; gameType: GameType }
    | { type: "room_joined"; roomId: string; gameType: GameType; players: PlayerInfo[] }
    | { type: "room_error"; message: string }
    | { type: "player_joined"; player: PlayerInfo }
    | { type: "player_left"; player: PlayerInfo; newHost?: string }
    | { type: "game_starting"; totalRounds: number }
    | { type: "pick_word"; words: string[] }
    | { type: "round_start"; round: number; drawer: string; wordLength: number; totalTurns: number; currentTurn: number }
    | { type: "draw"; x: number; y: number; color: string; strokeWidth: number; drawType: "start" | "draw" | "end" }
    | { type: "clear_canvas" }
    | { type: "correct_guess"; player: string; score: number; totalScore: number }
    | { type: "chat_message"; player: string; text: string; isSystem?: boolean }
    | { type: "timer_update"; timeLeft: number }
    | { type: "round_end"; word: string; leaderboard: LeaderboardEntry[] }
    | { type: "game_end"; leaderboard: LeaderboardEntry[]; winner: string }
    | { type: "player_list"; players: PlayerInfo[] }
    | { type: "you_are_drawing"; word: string }
    | { type: "word_hint"; hint: string }
    | { type: "close_guess"; text: string }
    // ── Hangman-specific ──
    | { type: "hangman_update"; revealedWord: string[]; wrongGuesses: number; guessedLetters: string[]; maxWrongGuesses: number }
    | { type: "letter_result"; letter: string; correct: boolean; player: string }
    // ── Tic-Tac-Toe-specific ──
    | { type: "ttt_update"; board: string[]; currentMark: "X" | "O"; playerX: string; playerO: string; playerXName: string; playerOName: string; lastMove?: { cell: number; mark: string; player: string } }
    | { type: "ttt_round_result"; result: "X" | "O" | "draw"; winLine: number[] | null; board: string[]; roundWins: { X: number; O: number } }
    // ── Fruit Ninja-specific ──
    | { type: "fn_spawn"; cube: FnCube }
    | { type: "fn_hit"; cubeId: number; slicedBy: string; points: number; destroyed: boolean; newHealth: number }
    | { type: "fn_miss"; cubeId: number; player: string; livesLeft: number }
    | { type: "fn_status"; scores: Record<string, number>; lives: Record<string, number> }
    | { type: "fn_slowmo"; player: string; active: boolean }
    | { type: "fn_round_result"; roundWins: Record<string, number>; scores: Record<string, number>; winner: string | null };

export interface PlayerInfo {
    socketId: string;
    username: string;
    score: number;
    isHost: boolean;
    isDrawing: boolean;
    hasGuessed: boolean;
    canGuess: boolean;
    avatar: string | null;
    location: { lat: number; lon: number; name: string } | null;
}

export interface LeaderboardEntry {
    username: string;
    score: number;
    roundScore: number;
}
