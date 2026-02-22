// ============================================
// Scribble Clone — Game Engine (Dispatcher + Doodle + Hangman + TTT + Fruit Ninja)
// ============================================

import type { Room, LeaderboardEntry, FnCube } from "./types";
import { GAME_CONFIG, HANGMAN_CONFIG, TICTACTOE_CONFIG, FRUITNINJA_CONFIG } from "./types";
import {
    getPlayer, getPlayersInRoom, broadcastToRoom, sendTo, toPlayerInfo,
} from "./state";
import { clearRoomTimers } from "./room";
import { GameHistory } from "./models/GameHistory";
import { User } from "./models/User";
import words from "./words.json";

// ---- Start Game (dispatcher) ----

const CREDIT_COST_PER_GAME = 100;

export async function startGame(socketId: string, room: Room): Promise<void> {
    if (room.hostId !== socketId) {
        sendTo(socketId, { type: "room_error", message: "Only the host can start the game" });
        return;
    }

    const config = room.gameType === "hangman" ? HANGMAN_CONFIG
                 : room.gameType === "tictactoe" ? TICTACTOE_CONFIG
                 : room.gameType === "fruitninja" ? FRUITNINJA_CONFIG
                 : GAME_CONFIG;

    if (room.players.length < config.minPlayers) {
        sendTo(socketId, { type: "room_error", message: `Need at least ${config.minPlayers} players` });
        return;
    }

    if (room.phase !== "waiting") {
        sendTo(socketId, { type: "room_error", message: "Game already in progress" });
        return;
    }

    // ---- Credit check & deduction (shared) ----
    const playersInRoom = getPlayersInRoom(room.roomId);
    const authUserIds = playersInRoom.map(p => p.authUserId);

    const poorPlayers = await User.find(
        { _id: { $in: authUserIds }, credits: { $lt: CREDIT_COST_PER_GAME } }
    ).select("username credits");

    if (poorPlayers.length > 0) {
        const names = poorPlayers.map(u => u.username).join(", ");
        broadcastToRoom(room.roomId, {
            type: "room_error",
            message: `Not enough credits! ${names} need${poorPlayers.length === 1 ? "s" : ""} at least ${CREDIT_COST_PER_GAME} credits.`,
        });
        return;
    }

    await User.updateMany(
        { _id: { $in: authUserIds } },
        { $inc: { credits: -CREDIT_COST_PER_GAME } }
    );

    for (const p of playersInRoom) {
        const updatedUser = await User.findById(p.authUserId).select("credits");
        sendTo(p.socketId, {
            type: "credits_deducted",
            cost: CREDIT_COST_PER_GAME,
            remaining: updatedUser?.credits ?? 0,
        });
    }

    // Reset all player scores
    for (const p of playersInRoom) {
        p.score = 0;
        p.hasGuessed = false;
        p.isDrawing = false;
        p.canGuess = true;
    }

    room.currentRound = 1;
    room.totalRounds = config.totalRounds;
    room.drawOrder = [...room.players];
    shuffleArray(room.drawOrder);
    room.roundDrawnCount = 0;
    room.currentDrawerIndex = -1;

    broadcastToRoom(room.roomId, { type: "game_starting", totalRounds: room.totalRounds });

    // Short delay before first turn
    setTimeout(() => {
        if (room.gameType === "hangman") {
            startHangmanTurn(room);
        } else if (room.gameType === "tictactoe") {
            startTttRound(room);
        } else if (room.gameType === "fruitninja") {
            startFnRound(room);
        } else {
            startTurn(room);
        }
    }, 1500);
}

// ---- Start Turn ----

function startTurn(room: Room): void {
    if (room.players.length < GAME_CONFIG.minPlayers) return;

    // Move to next drawer
    room.currentDrawerIndex++;

    // If we've gone through all players in drawOrder, handle it
    if (room.currentDrawerIndex >= room.drawOrder.length) {
        // All players have drawn this round, move to next round
        room.currentRound++;
        if (room.currentRound > room.totalRounds) {
            endGame(room);
            return;
        }
        // Reset for new round
        room.drawOrder = [...room.players];
        shuffleArray(room.drawOrder);
        room.currentDrawerIndex = 0;
        room.roundDrawnCount = 0;
    }

    const drawerSocketId = room.drawOrder[room.currentDrawerIndex];
    if (!drawerSocketId || !room.players.includes(drawerSocketId)) {
        // Drawer is no longer in the room, skip
        startTurn(room);
        return;
    }

    const drawer = getPlayer(drawerSocketId);
    if (!drawer) {
        startTurn(room);
        return;
    }

    // Reset player states for the new turn
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.hasGuessed = false;
        p.isDrawing = p.socketId === drawerSocketId;
        // Re-enable guessing for all players every turn
        // (previous drawers need canGuess reset to true)
        // Late joiners get re-enabled at round boundaries
        if (p.socketId !== drawerSocketId) {
            p.canGuess = true;
        }
    }
    // Drawer can't guess their own word
    drawer.canGuess = false;

    room.roundDrawnCount++;
    room.word = null;

    // Pick 3 random words for the drawer to choose from
    const wordChoices = getRandomWords(GAME_CONFIG.wordChoices);

    room.phase = "picking";

    // Tell the drawer to pick a word
    sendTo(drawerSocketId, { type: "pick_word", words: wordChoices });

    // Tell everyone else who's drawing
    const totalTurns = room.drawOrder.length;
    const currentTurn = room.currentDrawerIndex + 1;

    broadcastToRoom(room.roomId, {
        type: "round_start",
        round: room.currentRound,
        drawer: drawer.username,
        wordLength: 0, // will update when word is picked
        totalTurns,
        currentTurn,
    });

    // Send updated player list
    broadcastToRoom(room.roomId, {
        type: "player_list",
        players: playersInRoom.map((p) => toPlayerInfo(p, room)),
    });

    // Auto-pick timer — if drawer doesn't pick within 15s
    clearRoomTimers(room);
    room.timeLeft = GAME_CONFIG.pickTime;

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });
        if (room.timeLeft <= 0) {
            // Auto-pick first word
            selectWord(drawerSocketId, room, wordChoices[0]!);
        }
    }, 1000);
}

// ---- Select Word (dispatcher) ----

export function selectWord(socketId: string, room: Room, word: string): void {
    if (room.gameType === "hangman") {
        selectHangmanWord(socketId, room, word);
    } else {
        selectDoodleWord(socketId, room, word);
    }
}

function selectDoodleWord(socketId: string, room: Room, word: string): void {
    const player = getPlayer(socketId);
    if (!player || !player.isDrawing) return;
    if (room.phase !== "picking") return;

    room.word = word;
    room.phase = "drawing";

    clearRoomTimers(room);

    // Send the word to the drawer
    sendTo(socketId, { type: "you_are_drawing", word });

    // ── Progressive hint reveal ──
    const letters = word.split("");
    const revealed = letters.map((c) => c === " "); // spaces always shown

    function buildHint(): string {
        return letters.map((c, i) => {
            if (c === " ") return "  ";
            return revealed[i] ? c : "_";
        }).join(" ");
    }

    // Send initial all-blank hint to guessers
    broadcastToRoom(room.roomId, { type: "word_hint", hint: buildHint() }, socketId);

    // Pre-compute which indices can be revealed (non-space)
    const hiddenIndices = letters
        .map((c, i) => (c === " " ? -1 : i))
        .filter((i) => i !== -1);

    // Reveal up to 75% of non-space letters
    const maxReveals = Math.floor(hiddenIndices.length * 0.75);

    // Shuffle to randomise reveal order
    const revealOrder = [...hiddenIndices];
    for (let i = revealOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [revealOrder[i], revealOrder[j]] = [revealOrder[j]!, revealOrder[i]!];
    }
    const toReveal = revealOrder.slice(0, maxReveals);

    // Reveals start at 50% time, finish by 90% time
    const roundTime = GAME_CONFIG.roundTime;
    const revealStartAt = Math.floor(roundTime * 0.5);  // timeLeft when reveals begin
    const revealStopAt = Math.floor(roundTime * 0.1);   // timeLeft when reveals end

    // Build schedule: Map<timeLeft, indicesToReveal[]>
    const revealSchedule: Map<number, number[]> = new Map();
    if (toReveal.length > 0) {
        const windowSize = revealStartAt - revealStopAt;
        const interval = windowSize / toReveal.length;
        for (let i = 0; i < toReveal.length; i++) {
            const tick = Math.max(revealStopAt, Math.round(revealStartAt - (i + 1) * interval));
            if (!revealSchedule.has(tick)) revealSchedule.set(tick, []);
            revealSchedule.get(tick)!.push(toReveal[i]!);
        }
    }

    // Update round_start with actual word length
    broadcastToRoom(room.roomId, {
        type: "round_start",
        round: room.currentRound,
        drawer: player.username,
        wordLength: word.length,
        totalTurns: room.drawOrder.length,
        currentTurn: room.currentDrawerIndex + 1,
    });

    // Clear canvas for new turn
    broadcastToRoom(room.roomId, { type: "clear_canvas" });

    // Start draw timer with progressive hint reveals
    room.timeLeft = GAME_CONFIG.roundTime;
    broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });

        // Reveal scheduled letters at this tick
        const indicesToReveal = revealSchedule.get(room.timeLeft);
        if (indicesToReveal) {
            for (const idx of indicesToReveal) {
                revealed[idx] = true;
            }
            const drawerSid = room.drawOrder[room.currentDrawerIndex];
            broadcastToRoom(room.roomId, { type: "word_hint", hint: buildHint() }, drawerSid);
        }

        if (room.timeLeft <= 0) {
            endRound(room);
        }
    }, 1000);
}

// ---- Handle Guess (dispatcher) ----

export function handleGuess(socketId: string, room: Room, text: string): void {
    if (room.gameType === "hangman") {
        handleHangmanFullGuess(socketId, room, text);
    } else {
        handleDoodleGuess(socketId, room, text);
    }
}

function handleDoodleGuess(socketId: string, room: Room, text: string): void {
    const player = getPlayer(socketId);
    if (!player) return;

    // Drawer can't guess
    if (player.isDrawing) return;

    // Already guessed
    if (player.hasGuessed) return;

    // Late joiner can't guess this round
    if (!player.canGuess) {
        sendTo(socketId, {
            type: "chat_message",
            player: "System",
            text: "You can't guess this round (joined mid-game).",
            isSystem: true,
        });
        return;
    }

    // Rate limiting
    const now = Date.now();
    if (now - player.lastGuessTime < GAME_CONFIG.guessRateLimitMs) return;
    player.lastGuessTime = now;

    if (!room.word || room.phase !== "drawing") return;

    const guess = text.trim().toLowerCase();
    const answer = room.word.toLowerCase();

    if (guess === answer) {
        // Correct guess!
        player.hasGuessed = true;

        // Time-based scoring
        const timeRatio = room.timeLeft / GAME_CONFIG.roundTime;
        const score = Math.max(10, Math.ceil(timeRatio * 100));
        player.score += score;

        // Drawer bonus
        const drawer = getPlayersInRoom(room.roomId).find((p) => p.isDrawing);
        if (drawer) {
            drawer.score += 10;
        }

        broadcastToRoom(room.roomId, {
            type: "correct_guess",
            player: player.username,
            score,
            totalScore: player.score,
        });

        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `🎉 ${player.username} guessed the word!`,
            isSystem: true,
        });

        // Update player list
        const playersInRoom = getPlayersInRoom(room.roomId);
        broadcastToRoom(room.roomId, {
            type: "player_list",
            players: playersInRoom.map((p) => toPlayerInfo(p, room)),
        });

        // Check if all guessers have guessed
        const guessers = playersInRoom.filter((p) => !p.isDrawing && p.canGuess);
        if (guessers.every((p) => p.hasGuessed)) {
            endRoundEarly(room);
        }
    } else {
        // Check for close guess
        if (isCloseGuess(guess, answer)) {
            sendTo(socketId, {
                type: "close_guess",
                text: "That's close!",
            });
        }

        // Broadcast as regular chat message (but hide if it contains the word)
        if (!guess.includes(answer) && !answer.includes(guess)) {
            broadcastToRoom(room.roomId, {
                type: "chat_message",
                player: player.username,
                text,
            });
        } else {
            // Only show to the sender to prevent revealing letters
            sendTo(socketId, {
                type: "chat_message",
                player: player.username,
                text,
            });
        }
    }
}

// ---- End Round ----

function endRound(room: Room): void {
    clearRoomTimers(room);
    room.phase = "round_end";

    const leaderboard = buildLeaderboard(room);

    broadcastToRoom(room.roomId, {
        type: "round_end",
        word: room.word || "???",
        leaderboard,
    });

    // Reset drawing state
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.isDrawing = false;
        p.hasGuessed = false;
    }

    // After delay, start next turn or end game
    room.timer = setTimeout(() => {
        // TTT has its own round progression (best-of-5)
        if (room.gameType === "tictactoe") {
            // Check if someone won best-of-N
            const needed = TICTACTOE_CONFIG.winsNeeded;
            if (room.tttRoundWins.X >= needed || room.tttRoundWins.O >= needed || room.currentRound >= room.totalRounds) {
                endGame(room);
            } else {
                room.currentRound++;
                startTttRound(room);
            }
            return;
        }

        // Fruit Ninja has its own round progression (best-of-3)
        if (room.gameType === "fruitninja") {
            const needed = FRUITNINJA_CONFIG.winsNeeded;
            const anyWon = Object.values(room.fnRoundWins).some(w => w >= needed);
            if (anyWon || room.currentRound >= room.totalRounds) {
                endGame(room);
            } else {
                room.currentRound++;
                startFnRound(room);
            }
            return;
        }

        const nextDrawerIndex = room.currentDrawerIndex + 1;
        const startNextTurn = room.gameType === "hangman" ? startHangmanTurn : startTurn;

        if (nextDrawerIndex >= room.drawOrder.length) {
            // All players have drawn this round
            if (room.currentRound >= room.totalRounds) {
                endGame(room);
            } else {
                room.currentRound++;
                room.drawOrder = [...room.players];
                shuffleArray(room.drawOrder);
                room.currentDrawerIndex = -1;
                room.roundDrawnCount = 0;
                startNextTurn(room);
            }
        } else {
            startNextTurn(room);
        }
    }, GAME_CONFIG.roundEndDelay * 1000);
}

export function endRoundEarly(room: Room): void {
    // Give a brief moment before ending
    setTimeout(() => {
        if (room.phase === "drawing") {
            endRound(room);
        }
    }, 1000);
}

// ---- End Game ----

function endGame(room: Room): void {
    clearRoomTimers(room);
    room.phase = "game_end";

    const leaderboard = buildLeaderboard(room);
    const winner = leaderboard.length > 0 ? leaderboard[0]!.username : "Nobody";

    broadcastToRoom(room.roomId, {
        type: "game_end",
        leaderboard,
        winner,
    });

    // Persist game history to MongoDB (fire and forget)
    persistGameHistory(room, leaderboard, winner).catch((err) => {
        console.error("Failed to persist game history:", err);
    });
}

// ---- Persist Game History ----

async function persistGameHistory(
    room: Room,
    leaderboard: LeaderboardEntry[],
    winnerUsername: string
): Promise<void> {
    const playersInRoom = getPlayersInRoom(room.roomId);
    if (playersInRoom.length === 0) return;

    // Build player entries with real auth user IDs
    const playerEntries = leaderboard.map((entry, index) => {
        const player = playersInRoom.find((p) => p.username === entry.username);
        return {
            userId: player?.authUserId || "unknown",
            username: entry.username,
            score: entry.score,
            rank: index + 1,
        };
    });

    const winnerPlayer = playersInRoom.find((p) => p.username === winnerUsername);

    if (!winnerPlayer) return;

    // Save game history
    await GameHistory.create({
        roomId: room.roomId,
        gameType: room.gameType ?? "doodle",
        players: playerEntries,
        winner: {
            userId: winnerPlayer.authUserId,
            username: winnerUsername,
        },
        totalRounds: room.totalRounds,
    });

    // Update user stats
    const gt = room.gameType ?? "doodle";
    for (const entry of playerEntries) {
        if (entry.userId === "unknown") continue;
        const updateData: Record<string, number> = {
            gamesPlayed: 1,
            totalScore: entry.score,
            [`perGameStats.${gt}.played`]: 1,
        };
        if (entry.rank === 1) {
            updateData.gamesWon = 1;
            updateData[`perGameStats.${gt}.won`] = 1;
        }
        await User.findByIdAndUpdate(entry.userId, {
            $inc: updateData,
        }).catch(() => {});
    }
}

// ---- Play Again ----

export async function handlePlayAgain(socketId: string, room: Room): Promise<void> {
    if (room.hostId !== socketId) {
        sendTo(socketId, { type: "room_error", message: "Only the host can restart" });
        return;
    }

    // ---- Credit check & deduction ----
    const playersInRoom = getPlayersInRoom(room.roomId);
    const authUserIds = playersInRoom.map(p => p.authUserId);

    const poorPlayers = await User.find(
        { _id: { $in: authUserIds }, credits: { $lt: CREDIT_COST_PER_GAME } }
    ).select("username credits");

    if (poorPlayers.length > 0) {
        const names = poorPlayers.map(u => u.username).join(", ");
        broadcastToRoom(room.roomId, {
            type: "room_error",
            message: `Not enough credits! ${names} need${poorPlayers.length === 1 ? "s" : ""} at least ${CREDIT_COST_PER_GAME} credits.`,
        });
        return;
    }

    await User.updateMany(
        { _id: { $in: authUserIds } },
        { $inc: { credits: -CREDIT_COST_PER_GAME } }
    );

    for (const p of playersInRoom) {
        const updatedUser = await User.findById(p.authUserId).select("credits");
        sendTo(p.socketId, {
            type: "credits_deducted",
            cost: CREDIT_COST_PER_GAME,
            remaining: updatedUser?.credits ?? 0,
        });
    }

    // Reset everything
    for (const p of playersInRoom) {
        p.score = 0;
        p.hasGuessed = false;
        p.isDrawing = false;
        p.canGuess = true;
    }

    room.currentRound = 0;
    room.currentDrawerIndex = -1;
    room.word = null;
    room.phase = "waiting";
    room.roundDrawnCount = 0;
    // Reset hangman state
    room.guessedLetters = [];
    room.wrongGuesses = 0;
    room.revealedWord = [];
    // Reset tictactoe state
    room.tttBoard = Array(9).fill("");
    room.tttPlayerX = null;
    room.tttPlayerO = null;
    room.tttCurrentMark = "X";
    room.tttRoundWins = { X: 0, O: 0 };
    // Reset fruitninja state
    room.fnScores = {};
    room.fnLives = {};
    room.fnRoundWins = {};
    room.fnCubes = [];
    room.fnCubeIdCounter = 0;
    if (room.fnSpawnTimer) { clearInterval(room.fnSpawnTimer); room.fnSpawnTimer = null; }
    room.fnSlowmo = {};
    clearRoomTimers(room);

    // Send updated player list
    broadcastToRoom(room.roomId, {
        type: "player_list",
        players: playersInRoom.map((p) => toPlayerInfo(p, room)),
    });

    broadcastToRoom(room.roomId, {
        type: "chat_message",
        player: "System",
        text: "Game reset! Host can start a new game.",
        isSystem: true,
    });
}

// ---- Drawer Disconnect ----

export function handleDrawerDisconnect(room: Room): void {
    clearRoomTimers(room);

    broadcastToRoom(room.roomId, {
        type: "chat_message",
        player: "System",
        text: "The drawer left! Skipping to next turn...",
        isSystem: true,
    });

    if (room.word) {
        broadcastToRoom(room.roomId, {
            type: "round_end",
            word: room.word,
            leaderboard: buildLeaderboard(room),
        });
    }

    // Reset drawing states
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.isDrawing = false;
        p.hasGuessed = false;
    }

    room.phase = "round_end";

    // Start next turn after delay
    room.timer = setTimeout(() => {
        if (room.players.length >= GAME_CONFIG.minPlayers) {
            // Don't increment currentDrawerIndex — the array was already modified
            room.currentDrawerIndex--; // compensate for the startTurn increment
            if (room.gameType === "hangman") {
                startHangmanTurn(room);
            } else {
                startTurn(room);
            }
        }
    }, GAME_CONFIG.roundEndDelay * 1000);
}

// ---- Helpers ----

function buildLeaderboard(room: Room): LeaderboardEntry[] {
    const playersInRoom = getPlayersInRoom(room.roomId);
    return playersInRoom
        .map((p) => ({
            username: p.username,
            score: p.score,
            roundScore: 0, // could track per-round
        }))
        .sort((a, b) => b.score - a.score);
}

function getRandomWords(count: number): string[] {
    const shuffled = [...words].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
}

function shuffleArray(arr: string[]): void {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j]!, arr[i]!];
    }
}

function isCloseGuess(guess: string, answer: string): boolean {
    if (Math.abs(guess.length - answer.length) > 2) return false;
    const distance = levenshtein(guess, answer);
    return distance > 0 && distance <= 2;
}

function levenshtein(a: string, b: string): number {
    const matrix: number[][] = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0]![j] = j;

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i]![j] = matrix[i - 1]![j - 1]!;
            } else {
                matrix[i]![j] = Math.min(
                    matrix[i - 1]![j - 1]! + 1,
                    matrix[i]![j - 1]! + 1,
                    matrix[i - 1]![j]! + 1
                );
            }
        }
    }
    return matrix[b.length]![a.length]!;
}

// ============================================
// ──────────── HANGMAN ENGINE ────────────────
// ============================================

function startHangmanTurn(room: Room): void {
    if (room.players.length < HANGMAN_CONFIG.minPlayers) return;

    room.currentDrawerIndex++;

    if (room.currentDrawerIndex >= room.drawOrder.length) {
        room.currentRound++;
        if (room.currentRound > room.totalRounds) {
            endGame(room);
            return;
        }
        room.drawOrder = [...room.players];
        shuffleArray(room.drawOrder);
        room.currentDrawerIndex = 0;
        room.roundDrawnCount = 0;
    }

    const setterSocketId = room.drawOrder[room.currentDrawerIndex];
    if (!setterSocketId || !room.players.includes(setterSocketId)) {
        startHangmanTurn(room);
        return;
    }

    const setter = getPlayer(setterSocketId);
    if (!setter) {
        startHangmanTurn(room);
        return;
    }

    // Reset player states for the new turn
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.hasGuessed = false;
        p.isDrawing = p.socketId === setterSocketId; // "isDrawing" = word setter
        if (p.socketId !== setterSocketId) {
            p.canGuess = true;
        }
    }
    setter.canGuess = false;

    room.roundDrawnCount++;
    room.word = null;

    // Reset hangman state
    room.guessedLetters = [];
    room.wrongGuesses = 0;
    room.revealedWord = [];

    const wordChoices = getRandomWords(HANGMAN_CONFIG.wordChoices);

    room.phase = "picking";

    sendTo(setterSocketId, { type: "pick_word", words: wordChoices });

    const totalTurns = room.drawOrder.length;
    const currentTurn = room.currentDrawerIndex + 1;

    broadcastToRoom(room.roomId, {
        type: "round_start",
        round: room.currentRound,
        drawer: setter.username, // "drawer" = word setter in hangman
        wordLength: 0,
        totalTurns,
        currentTurn,
    });

    broadcastToRoom(room.roomId, {
        type: "player_list",
        players: playersInRoom.map((p) => toPlayerInfo(p, room)),
    });

    // Auto-pick timer
    clearRoomTimers(room);
    room.timeLeft = HANGMAN_CONFIG.pickTime;

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });
        if (room.timeLeft <= 0) {
            selectHangmanWord(setterSocketId, room, wordChoices[0]!);
        }
    }, 1000);
}

function selectHangmanWord(socketId: string, room: Room, word: string): void {
    const player = getPlayer(socketId);
    if (!player || !player.isDrawing) return;
    if (room.phase !== "picking") return;

    room.word = word;
    room.phase = "drawing";

    clearRoomTimers(room);

    // Init hangman mask
    const letters = word.split("");
    room.revealedWord = letters.map((c) => c === " "); // spaces shown from start
    room.guessedLetters = [];
    room.wrongGuesses = 0;

    // Tell the word setter
    sendTo(socketId, { type: "you_are_drawing", word });

    // Build revealed word for clients
    const revealedForClient = letters.map((c, i) =>
        room.revealedWord[i] ? c : "_"
    );

    // Send initial hangman state to all
    broadcastToRoom(room.roomId, {
        type: "hangman_update",
        revealedWord: revealedForClient,
        wrongGuesses: 0,
        guessedLetters: [],
        maxWrongGuesses: room.maxWrongGuesses,
    });

    // Send word_hint for compatibility (underscore display)
    const hint = letters.map((c, i) => {
        if (c === " ") return "  ";
        return room.revealedWord[i] ? c : "_";
    }).join(" ");
    broadcastToRoom(room.roomId, { type: "word_hint", hint }, socketId);

    // Update round info with word length
    broadcastToRoom(room.roomId, {
        type: "round_start",
        round: room.currentRound,
        drawer: player.username,
        wordLength: word.length,
        totalTurns: room.drawOrder.length,
        currentTurn: room.currentDrawerIndex + 1,
    });

    // Start round timer
    room.timeLeft = HANGMAN_CONFIG.roundTime;
    broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });
        if (room.timeLeft <= 0) {
            endRound(room);
        }
    }, 1000);
}

// ---- Hangman: letter guess ----

export function handleLetterGuess(socketId: string, room: Room, letter: string): void {
    if (room.gameType !== "hangman") return;
    if (room.phase !== "drawing") return;
    if (!room.word) return;

    const player = getPlayer(socketId);
    if (!player) return;

    // Word setter can't guess
    if (player.isDrawing) return;

    // Can't guess if not allowed (late joiner)
    if (!player.canGuess) return;

    const l = letter.toLowerCase().charAt(0);
    if (!l || !/[a-z]/.test(l)) return;

    // Already guessed this letter
    if (room.guessedLetters.includes(l)) return;

    room.guessedLetters.push(l);

    const wordLetters = room.word.split("");
    const isCorrect = wordLetters.some((c) => c.toLowerCase() === l);

    if (isCorrect) {
        // Reveal matched letters
        for (let i = 0; i < wordLetters.length; i++) {
            if (wordLetters[i]!.toLowerCase() === l) {
                room.revealedWord[i] = true;
            }
        }

        // Score: 15 points per correct letter guess
        player.score += 15;

        broadcastToRoom(room.roomId, {
            type: "letter_result",
            letter: l,
            correct: true,
            player: player.username,
        });
    } else {
        room.wrongGuesses++;

        // Word setter gets +5 per wrong guess
        const setter = getPlayersInRoom(room.roomId).find((p) => p.isDrawing);
        if (setter) setter.score += 5;

        broadcastToRoom(room.roomId, {
            type: "letter_result",
            letter: l,
            correct: false,
            player: player.username,
        });
    }

    // Send updated hangman state
    const revealedForClient = wordLetters.map((c, i) =>
        room.revealedWord[i] ? c : "_"
    );

    broadcastToRoom(room.roomId, {
        type: "hangman_update",
        revealedWord: revealedForClient,
        wrongGuesses: room.wrongGuesses,
        guessedLetters: room.guessedLetters,
        maxWrongGuesses: room.maxWrongGuesses,
    });

    // Update hint
    const hint = wordLetters.map((c, i) => {
        if (c === " ") return "  ";
        return room.revealedWord[i] ? c : "_";
    }).join(" ");
    const setterSid = room.drawOrder[room.currentDrawerIndex];
    broadcastToRoom(room.roomId, { type: "word_hint", hint }, setterSid);

    // Send updated player list
    const playersInRoom = getPlayersInRoom(room.roomId);
    broadcastToRoom(room.roomId, {
        type: "player_list",
        players: playersInRoom.map((p) => toPlayerInfo(p, room)),
    });

    // Check win/lose
    const allRevealed = room.revealedWord.every((r) => r);
    if (allRevealed) {
        // Word solved! Bonus for revealing last letter
        player.score += Math.max(10, Math.ceil((room.timeLeft / HANGMAN_CONFIG.roundTime) * 50));

        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `🎉 Word solved! ${player.username} revealed the last letter!`,
            isSystem: true,
        });

        endRoundEarly(room);
    } else if (room.wrongGuesses >= room.maxWrongGuesses) {
        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `💀 Hangman complete! The word was: ${room.word}`,
            isSystem: true,
        });

        endRound(room);
    }
}

// ---- Hangman: full word guess (via chat) ----

function handleHangmanFullGuess(socketId: string, room: Room, text: string): void {
    const player = getPlayer(socketId);
    if (!player) return;

    if (player.isDrawing) return;
    if (player.hasGuessed) return;
    if (!player.canGuess) return;

    const now = Date.now();
    if (now - player.lastGuessTime < HANGMAN_CONFIG.guessRateLimitMs) return;
    player.lastGuessTime = now;

    if (!room.word || room.phase !== "drawing") return;

    const guess = text.trim().toLowerCase();
    const answer = room.word.toLowerCase();

    // If it's a single letter, treat as letter guess
    if (guess.length === 1 && /[a-z]/.test(guess)) {
        handleLetterGuess(socketId, room, guess);
        return;
    }

    if (guess === answer) {
        // Correct full-word guess!
        player.hasGuessed = true;

        // Time-based scoring (bigger bonus for full word)
        const timeRatio = room.timeLeft / HANGMAN_CONFIG.roundTime;
        const score = Math.max(20, Math.ceil(timeRatio * 150));
        player.score += score;

        // Reveal all letters
        room.revealedWord = room.word.split("").map(() => true);

        broadcastToRoom(room.roomId, {
            type: "correct_guess",
            player: player.username,
            score,
            totalScore: player.score,
        });

        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `🎉 ${player.username} guessed the full word!`,
            isSystem: true,
        });

        // Send final hangman state
        const revealedForClient = room.word.split("").map((c) => c);
        broadcastToRoom(room.roomId, {
            type: "hangman_update",
            revealedWord: revealedForClient,
            wrongGuesses: room.wrongGuesses,
            guessedLetters: room.guessedLetters,
            maxWrongGuesses: room.maxWrongGuesses,
        });

        const playersInRoom = getPlayersInRoom(room.roomId);
        broadcastToRoom(room.roomId, {
            type: "player_list",
            players: playersInRoom.map((p) => toPlayerInfo(p, room)),
        });

        endRoundEarly(room);
    } else {
        // Wrong full-word guess counts as a wrong guess (adds body part!)
        room.wrongGuesses++;

        // Word setter gets +5
        const setter = getPlayersInRoom(room.roomId).find((p) => p.isDrawing);
        if (setter) setter.score += 5;

        broadcastToRoom(room.roomId, {
            type: "letter_result",
            letter: guess,
            correct: false,
            player: player.username,
        });

        // Send updated hangman state
        const wordLetters = room.word.split("");
        const revealedForClient = wordLetters.map((c, i) =>
            room.revealedWord[i] ? c : "_"
        );
        broadcastToRoom(room.roomId, {
            type: "hangman_update",
            revealedWord: revealedForClient,
            wrongGuesses: room.wrongGuesses,
            guessedLetters: room.guessedLetters,
            maxWrongGuesses: room.maxWrongGuesses,
        });

        // Broadcast wrong guess as chat
        if (!guess.includes(answer) && !answer.includes(guess)) {
            broadcastToRoom(room.roomId, {
                type: "chat_message",
                player: player.username,
                text,
            });
        } else {
            sendTo(socketId, {
                type: "chat_message",
                player: player.username,
                text,
            });
        }

        // Check if hangman complete
        if (room.wrongGuesses >= room.maxWrongGuesses) {
            broadcastToRoom(room.roomId, {
                type: "chat_message",
                player: "System",
                text: `💀 Hangman complete! The word was: ${room.word}`,
                isSystem: true,
            });
            endRound(room);
        }
    }
}

// ============================================
// ──────────── TIC-TAC-TOE ENGINE ────────────
// ============================================

const TTT_WIN_LINES = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
    [0, 4, 8], [2, 4, 6],             // diagonals
];

function startTttRound(room: Room): void {
    if (room.players.length < TICTACTOE_CONFIG.minPlayers) return;

    // Reset board
    room.tttBoard = Array(9).fill("");

    // Assign X and O — alternate who starts each round
    const isEvenRound = room.currentRound % 2 === 1; // round 1,3,5 → host=X; round 2,4 → host=O
    if (isEvenRound) {
        room.tttPlayerX = room.players[0]!;
        room.tttPlayerO = room.players[1]!;
    } else {
        room.tttPlayerX = room.players[1]!;
        room.tttPlayerO = room.players[0]!;
    }
    room.tttCurrentMark = "X"; // X always goes first

    // Set the X player as "drawing" (i.e. active turn)
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.isDrawing = p.socketId === room.tttPlayerX;
        p.hasGuessed = false;
        p.canGuess = true;
    }

    room.phase = "drawing";
    room.word = null;

    const playerX = getPlayer(room.tttPlayerX!);
    const playerO = getPlayer(room.tttPlayerO!);

    // Broadcast round start
    broadcastToRoom(room.roomId, {
        type: "round_start",
        round: room.currentRound,
        drawer: playerX?.username ?? "Player X",
        wordLength: 0,
        totalTurns: 0,
        currentTurn: 0,
    });

    // Send initial board state
    broadcastToRoom(room.roomId, {
        type: "ttt_update",
        board: room.tttBoard,
        currentMark: room.tttCurrentMark,
        playerX: room.tttPlayerX!,
        playerO: room.tttPlayerO!,
        playerXName: playerX?.username ?? "Player X",
        playerOName: playerO?.username ?? "Player O",
    });

    // Send player list
    broadcastToRoom(room.roomId, {
        type: "player_list",
        players: playersInRoom.map((p) => toPlayerInfo(p, room)),
    });

    // Start turn timer
    clearRoomTimers(room);
    room.timeLeft = TICTACTOE_CONFIG.turnTime;
    broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });
        if (room.timeLeft <= 0) {
            handleTttTimeout(room);
        }
    }, 1000);
}

export function handleTttMove(socketId: string, room: Room, cell: number): void {
    if (room.gameType !== "tictactoe") return;
    if (room.phase !== "drawing") return;

    const player = getPlayer(socketId);
    if (!player) return;

    // Validate it's this player's turn
    const isX = socketId === room.tttPlayerX;
    const isO = socketId === room.tttPlayerO;
    if (!isX && !isO) return;

    const expectedMark = room.tttCurrentMark;
    if ((expectedMark === "X" && !isX) || (expectedMark === "O" && !isO)) {
        sendTo(socketId, { type: "room_error", message: "Not your turn!" });
        return;
    }

    // Validate cell
    if (cell < 0 || cell > 8 || room.tttBoard[cell] !== "") {
        sendTo(socketId, { type: "room_error", message: "Invalid move" });
        return;
    }

    // Place mark
    room.tttBoard[cell] = expectedMark;

    const playerX = getPlayer(room.tttPlayerX!);
    const playerO = getPlayer(room.tttPlayerO!);

    // Check for win or draw
    const result = checkTttWinner(room.tttBoard);
    const isDraw = !result.winner && room.tttBoard.every((c) => c !== "");

    // Broadcast updated board
    broadcastToRoom(room.roomId, {
        type: "ttt_update",
        board: room.tttBoard,
        currentMark: expectedMark === "X" ? "O" : "X",
        playerX: room.tttPlayerX!,
        playerO: room.tttPlayerO!,
        playerXName: playerX?.username ?? "Player X",
        playerOName: playerO?.username ?? "Player O",
        lastMove: { cell, mark: expectedMark, player: player.username },
    });

    if (result.winner) {
        // Round won!
        room.tttRoundWins[result.winner]++;
        const winnerSocketId = result.winner === "X" ? room.tttPlayerX : room.tttPlayerO;
        const winnerPlayer = winnerSocketId ? getPlayer(winnerSocketId) : null;
        if (winnerPlayer) winnerPlayer.score += 100;

        broadcastToRoom(room.roomId, {
            type: "ttt_round_result",
            result: result.winner,
            winLine: result.line ?? null,
            board: room.tttBoard,
            roundWins: room.tttRoundWins,
        });

        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `🎉 ${winnerPlayer?.username ?? result.winner} wins this round!`,
            isSystem: true,
        });

        finishTttRound(room);
    } else if (isDraw) {
        // Draw — both get points
        const playersInRoom = getPlayersInRoom(room.roomId);
        for (const p of playersInRoom) {
            p.score += 25;
        }

        broadcastToRoom(room.roomId, {
            type: "ttt_round_result",
            result: "draw",
            winLine: null,
            board: room.tttBoard,
            roundWins: room.tttRoundWins,
        });

        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: "🤝 It's a draw! Both players get 25 points.",
            isSystem: true,
        });

        finishTttRound(room);
    } else {
        // Toggle turn
        room.tttCurrentMark = expectedMark === "X" ? "O" : "X";
        const nextPlayerSocketId = room.tttCurrentMark === "X" ? room.tttPlayerX : room.tttPlayerO;

        // Update isDrawing
        const playersInRoom = getPlayersInRoom(room.roomId);
        for (const p of playersInRoom) {
            p.isDrawing = p.socketId === nextPlayerSocketId;
        }

        broadcastToRoom(room.roomId, {
            type: "player_list",
            players: playersInRoom.map((p) => toPlayerInfo(p, room)),
        });

        // Reset turn timer
        clearRoomTimers(room);
        room.timeLeft = TICTACTOE_CONFIG.turnTime;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });

        room.timerInterval = setInterval(() => {
            room.timeLeft--;
            broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });
            if (room.timeLeft <= 0) {
                handleTttTimeout(room);
            }
        }, 1000);
    }
}

function handleTttTimeout(room: Room): void {
    clearRoomTimers(room);
    if (room.phase !== "drawing") return;

    // The player whose turn timed out forfeits this round
    const timedOutMark = room.tttCurrentMark;
    const winnerMark = timedOutMark === "X" ? "O" : "X";

    room.tttRoundWins[winnerMark]++;
    const winnerSocketId = winnerMark === "X" ? room.tttPlayerX : room.tttPlayerO;
    const winnerPlayer = winnerSocketId ? getPlayer(winnerSocketId) : null;
    if (winnerPlayer) winnerPlayer.score += 100;

    const timedOutSocketId = timedOutMark === "X" ? room.tttPlayerX : room.tttPlayerO;
    const timedOutPlayer = timedOutSocketId ? getPlayer(timedOutSocketId) : null;

    broadcastToRoom(room.roomId, {
        type: "ttt_round_result",
        result: winnerMark,
        winLine: null,
        board: room.tttBoard,
        roundWins: room.tttRoundWins,
    });

    broadcastToRoom(room.roomId, {
        type: "chat_message",
        player: "System",
        text: `⏰ ${timedOutPlayer?.username ?? timedOutMark} ran out of time! ${winnerPlayer?.username ?? winnerMark} wins the round.`,
        isSystem: true,
    });

    finishTttRound(room);
}

export function handleTttPlayerLeave(room: Room, leavingSocketId: string): void {
    clearRoomTimers(room);
    if (room.phase !== "drawing") return;

    // Remaining player wins all remaining rounds
    const remainingSocketId = room.players[0]; // after removal, only one left
    const remainingPlayer = remainingSocketId ? getPlayer(remainingSocketId) : null;

    if (remainingPlayer) {
        remainingPlayer.score += 100;
    }

    // Figure out which mark the remaining player is
    const remainingMark = remainingSocketId === room.tttPlayerX ? "X" : "O";
    room.tttRoundWins[remainingMark]++;

    broadcastToRoom(room.roomId, {
        type: "ttt_round_result",
        result: remainingMark,
        winLine: null,
        board: room.tttBoard,
        roundWins: room.tttRoundWins,
    });

    broadcastToRoom(room.roomId, {
        type: "chat_message",
        player: "System",
        text: `${remainingPlayer?.username ?? "Opponent"} wins — other player left!`,
        isSystem: true,
    });

    // End the whole game since 2-player only
    setTimeout(() => {
        endGame(room);
    }, TICTACTOE_CONFIG.roundEndDelay * 1000);
}

function finishTttRound(room: Room): void {
    clearRoomTimers(room);
    room.phase = "round_end";

    const leaderboard = buildLeaderboard(room);

    broadcastToRoom(room.roomId, {
        type: "round_end",
        word: `Round ${room.currentRound}`,
        leaderboard,
    });

    // Reset drawing state
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.isDrawing = false;
        p.hasGuessed = false;
    }

    // Check if game should end (best-of-5, first to 3)
    const needed = TICTACTOE_CONFIG.winsNeeded;
    room.timer = setTimeout(() => {
        if (room.tttRoundWins.X >= needed || room.tttRoundWins.O >= needed) {
            // Game winner bonus
            const gameWinnerMark = room.tttRoundWins.X >= needed ? "X" : "O";
            const gameWinnerSocketId = gameWinnerMark === "X" ? room.tttPlayerX : room.tttPlayerO;
            const gameWinner = gameWinnerSocketId ? getPlayer(gameWinnerSocketId) : null;
            if (gameWinner) gameWinner.score += 50; // bonus for winning the series
            endGame(room);
        } else if (room.currentRound >= room.totalRounds) {
            endGame(room);
        } else {
            room.currentRound++;
            startTttRound(room);
        }
    }, TICTACTOE_CONFIG.roundEndDelay * 1000);
}

function checkTttWinner(board: string[]): { winner: "X" | "O" | null; line?: number[] } {
    for (const line of TTT_WIN_LINES) {
        const [a, b, c] = line;
        if (board[a!] && board[a!] === board[b!] && board[a!] === board[c!]) {
            return { winner: board[a!] as "X" | "O", line };
        }
    }
    return { winner: null };
}

// ──────────── FRUIT NINJA ENGINE ────────────
// ============================================

const FN_COLORS = ["blue", "green", "pink", "orange"];

function clearFnSpawnTimer(room: Room): void {
    if (room.fnSpawnTimer) {
        clearInterval(room.fnSpawnTimer);
        room.fnSpawnTimer = null;
    }
}

function startFnRound(room: Room): void {
    if (room.players.length < FRUITNINJA_CONFIG.minPlayers) return;

    // Init per-player state
    room.fnScores = {};
    room.fnLives = {};
    room.fnSlowmo = {};
    room.fnCubes = [];
    room.fnCubeIdCounter = 0;

    for (const sid of room.players) {
        room.fnScores[sid] = 0;
        room.fnLives[sid] = FRUITNINJA_CONFIG.maxLives;
        room.fnSlowmo[sid] = 0;
    }

    room.phase = "drawing"; // reuse "drawing" = active gameplay
    room.word = null;

    // Mark both players as active (isDrawing = true means "active player")
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.isDrawing = true;
        p.hasGuessed = false;
        p.canGuess = true;
    }

    // Broadcast round start
    broadcastToRoom(room.roomId, {
        type: "round_start",
        round: room.currentRound,
        totalRounds: room.totalRounds,
        drawer: "Fruit Ninja",
        wordLength: 0,
        totalTurns: 0,
        currentTurn: 0,
    });

    // Send initial status
    broadcastToRoom(room.roomId, {
        type: "fn_status",
        scores: { ...room.fnScores },
        lives: { ...room.fnLives },
    });

    // Send player list
    broadcastToRoom(room.roomId, {
        type: "player_list",
        players: playersInRoom.map((p) => toPlayerInfo(p, room)),
    });

    // Start round timer (60 seconds)
    clearRoomTimers(room);
    room.timeLeft = FRUITNINJA_CONFIG.roundTime;
    broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });

    room.timerInterval = setInterval(() => {
        room.timeLeft--;
        broadcastToRoom(room.roomId, { type: "timer_update", timeLeft: room.timeLeft });
        if (room.timeLeft <= 0) {
            finishFnRound(room);
        }
    }, 1000);

    // Start spawning cubes
    startFnSpawning(room);
}

function startFnSpawning(room: Room): void {
    clearFnSpawnTimer(room);

    const spawn = () => {
        if (room.phase !== "drawing") return;
        // Spawn one cube per active player
        for (const sid of room.players) {
            if ((room.fnLives[sid] ?? 0) <= 0) continue; // skip eliminated players
            spawnFnCube(room, sid);
        }
    };

    // Initial spawn
    spawn();

    // Dynamic interval: gets faster as game progresses
    const scheduleNext = () => {
        if (room.phase !== "drawing") return;
        const elapsed = FRUITNINJA_CONFIG.roundTime - room.timeLeft;
        const progress = elapsed / FRUITNINJA_CONFIG.roundTime; // 0→1
        const interval = FRUITNINJA_CONFIG.spawnIntervalMs -
            (FRUITNINJA_CONFIG.spawnIntervalMs - FRUITNINJA_CONFIG.spawnIntervalMinMs) * progress;

        room.fnSpawnTimer = setTimeout(() => {
            spawn();
            scheduleNext();
        }, interval) as unknown as ReturnType<typeof setInterval>;
    };
    scheduleNext();
}

function spawnFnCube(room: Room, targetPlayer: string): void {
    const id = ++room.fnCubeIdCounter;

    // Random properties (0-100 percentage coordinate space)
    const x = 15 + Math.random() * 70; // 15%-85% horizontal
    const xD = (Math.random() - 0.5) * 0.5; // slight horizontal drift (%/frame)
    const yD = -(2.0 + Math.random() * 1.5); // upward speed (%/frame, negative = up)

    // Determine cube type
    let color = FN_COLORS[Math.floor(Math.random() * FN_COLORS.length)]!;
    let wireframe = false;
    let health = 1;

    const cubeCount = room.fnScores[targetPlayer] ?? 0;

    // 8% chance of wireframe (slow-mo) cube after 5+ score
    if (cubeCount >= 50 && Math.random() < 0.08) {
        color = "blue";
        wireframe = true;
    }
    // 12% chance of strong (3-health) cube after 200+ score
    else if (cubeCount >= 200 && Math.random() < 0.12) {
        color = "pink";
        health = 3;
    }

    const cube: FnCube = {
        id,
        targetPlayer,
        x,
        y: 110, // start below screen (110%)
        xD,
        yD,
        color,
        health,
        wireframe,
        spawnedAt: Date.now(),
    };

    room.fnCubes.push(cube);

    // Broadcast spawn to all players
    broadcastToRoom(room.roomId, { type: "fn_spawn", cube });
}

export function handleFnSlice(socketId: string, room: Room, cubeId: number): void {
    if (room.gameType !== "fruitninja") return;
    if (room.phase !== "drawing") return;

    // Find the cube
    const cubeIdx = room.fnCubes.findIndex(c => c.id === cubeId);
    if (cubeIdx === -1) return;

    const cube = room.fnCubes[cubeIdx]!;

    // Only the target player can slice their own cube
    if (cube.targetPlayer !== socketId) return;

    // Decrease health
    cube.health--;

    const points = cube.wireframe ? 5 : (cube.health <= 0 ? 10 : 5);
    room.fnScores[socketId] = (room.fnScores[socketId] ?? 0) + points;

    // Update the player's overall score too
    const player = getPlayer(socketId);
    if (player) player.score += points;

    const destroyed = cube.health <= 0;

    if (destroyed) {
        room.fnCubes.splice(cubeIdx, 1);

        // Wireframe triggers slow-mo
        if (cube.wireframe) {
            room.fnSlowmo[socketId] = 1500; // 1.5s of slow-mo
            broadcastToRoom(room.roomId, { type: "fn_slowmo", player: socketId, active: true });

            // Auto-disable after duration
            setTimeout(() => {
                room.fnSlowmo[socketId] = 0;
                if (room.phase === "drawing") {
                    broadcastToRoom(room.roomId, { type: "fn_slowmo", player: socketId, active: false });
                }
            }, 1500);
        }
    }

    broadcastToRoom(room.roomId, {
        type: "fn_hit",
        cubeId,
        slicedBy: socketId,
        points,
        destroyed,
        newHealth: cube.health,
    });

    // Send status update
    broadcastToRoom(room.roomId, {
        type: "fn_status",
        scores: { ...room.fnScores },
        lives: { ...room.fnLives },
    });
}

export function handleFnMiss(socketId: string, room: Room, cubeId: number): void {
    if (room.gameType !== "fruitninja") return;
    if (room.phase !== "drawing") return;

    // Find the cube
    const cubeIdx = room.fnCubes.findIndex(c => c.id === cubeId);
    if (cubeIdx === -1) return;

    const cube = room.fnCubes[cubeIdx]!;

    // Only the target player should report misses for their cubes
    if (cube.targetPlayer !== socketId) return;

    // Remove the cube
    room.fnCubes.splice(cubeIdx, 1);

    // Deduct 1 life
    room.fnLives[socketId] = Math.max(0, (room.fnLives[socketId] ?? 0) - 1);
    const livesLeft = room.fnLives[socketId] ?? 0;

    broadcastToRoom(room.roomId, {
        type: "fn_miss",
        cubeId,
        player: socketId,
        livesLeft,
    });

    broadcastToRoom(room.roomId, {
        type: "fn_status",
        scores: { ...room.fnScores },
        lives: { ...room.fnLives },
    });

    const player = getPlayer(socketId);

    // Check if player is eliminated
    if (livesLeft <= 0) {
        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `💀 ${player?.username ?? "A player"} lost all lives!`,
            isSystem: true,
        });

        // Check if all players are eliminated
        const allDead = room.players.every(sid => (room.fnLives[sid] ?? 0) <= 0);
        if (allDead) {
            finishFnRound(room);
        }
    }
}

export function handleFnPlayerLeave(room: Room, leavingSocketId: string): void {
    clearRoomTimers(room);
    clearFnSpawnTimer(room);
    if (room.phase !== "drawing") return;

    const remainingSocketId = room.players[0]; // after removal, only one left
    const remainingPlayer = remainingSocketId ? getPlayer(remainingSocketId) : null;

    if (remainingPlayer) {
        remainingPlayer.score += 100;
    }

    // Remaining player wins this round
    if (remainingSocketId) {
        room.fnRoundWins[remainingSocketId] = (room.fnRoundWins[remainingSocketId] ?? 0) + 1;
    }

    broadcastToRoom(room.roomId, {
        type: "fn_round_result",
        roundWins: { ...room.fnRoundWins },
        scores: { ...room.fnScores },
        winner: remainingSocketId ?? null,
    });

    broadcastToRoom(room.roomId, {
        type: "chat_message",
        player: "System",
        text: `${remainingPlayer?.username ?? "Opponent"} wins — other player left!`,
        isSystem: true,
    });

    // End the whole game since 2-player only
    setTimeout(() => {
        endGame(room);
    }, FRUITNINJA_CONFIG.roundEndDelay * 1000);
}

function finishFnRound(room: Room): void {
    clearRoomTimers(room);
    clearFnSpawnTimer(room);
    room.phase = "round_end";
    room.fnCubes = [];

    // Determine round winner — highest score wins
    let bestScore = -1;
    let roundWinner: string | null = null;
    for (const sid of room.players) {
        const score = room.fnScores[sid] ?? 0;
        if (score > bestScore) {
            bestScore = score;
            roundWinner = sid;
        } else if (score === bestScore) {
            roundWinner = null; // tie
        }
    }

    if (roundWinner) {
        room.fnRoundWins[roundWinner] = (room.fnRoundWins[roundWinner] ?? 0) + 1;
        const winner = getPlayer(roundWinner);
        if (winner) winner.score += 50; // round win bonus

        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `🎉 ${winner?.username ?? "A player"} wins round ${room.currentRound}!`,
            isSystem: true,
        });
    } else {
        broadcastToRoom(room.roomId, {
            type: "chat_message",
            player: "System",
            text: `🤝 Round ${room.currentRound} is a draw!`,
            isSystem: true,
        });
    }

    broadcastToRoom(room.roomId, {
        type: "fn_round_result",
        roundWins: { ...room.fnRoundWins },
        scores: { ...room.fnScores },
        winner: roundWinner,
    });

    const leaderboard = buildLeaderboard(room);

    broadcastToRoom(room.roomId, {
        type: "round_end",
        word: `Round ${room.currentRound}`,
        leaderboard,
    });

    // Reset drawing state
    const playersInRoom = getPlayersInRoom(room.roomId);
    for (const p of playersInRoom) {
        p.isDrawing = false;
        p.hasGuessed = false;
    }

    // Check if game should end (best-of-3, first to 2)
    const needed = FRUITNINJA_CONFIG.winsNeeded;
    room.timer = setTimeout(() => {
        const anyWon = Object.values(room.fnRoundWins).some(w => w >= needed);
        if (anyWon) {
            // Game winner bonus
            const gameWinnerId = Object.entries(room.fnRoundWins).find(([, w]) => w >= needed)?.[0];
            const gameWinner = gameWinnerId ? getPlayer(gameWinnerId) : null;
            if (gameWinner) gameWinner.score += 100; // series win bonus
            endGame(room);
        } else if (room.currentRound >= room.totalRounds) {
            endGame(room);
        } else {
            room.currentRound++;
            startFnRound(room);
        }
    }, FRUITNINJA_CONFIG.roundEndDelay * 1000);
}
