/* ── Socket React Hooks ── */

import { useEffect, useRef, useCallback } from 'react';
import { socket } from '../lib/socket';
import { useAuthStore } from '../stores/authStore';
import { useGameStore, createMsgId } from '../stores/gameStore';
import type { GameType } from '../stores/gameStore';
import type { Player } from '../lib/types';

/** Map raw backend player (socketId) → frontend Player (id) */
export function mapPlayer(raw: Record<string, unknown>): Player {
  const loc = raw.location as { name?: string; label?: string } | null | undefined;
  return {
    id: (raw.socketId ?? raw.id) as string,
    username: raw.username as string,
    avatar: raw.avatar as string | undefined,
    score: (raw.score as number) ?? 0,
    isHost: (raw.isHost as boolean) ?? false,
    isDrawing: raw.isDrawing as boolean | undefined,
    hasGuessed: raw.hasGuessed as boolean | undefined,
    location: loc ? { name: loc.name ?? loc.label ?? '' } : null,
  };
}

export function mapPlayers(raw: unknown): Player[] {
  return (raw as Record<string, unknown>[]).map(mapPlayer);
}

/**
 * Subscribe to a specific socket event. Auto-cleans up on unmount.
 */
export function useSocketEvent(type: string, handler: (data: Record<string, unknown>) => void) {
  const savedHandler = useRef(handler);
  savedHandler.current = handler;

  useEffect(() => {
    const h = (data: Record<string, unknown>) => savedHandler.current(data);
    socket.on(type, h);
    return () => { socket.off(type, h); };
  }, [type]);
}

/**
 * Connect/disconnect socket based on auth state.
 * Also sets up all "global" socket event handlers (room, credits, etc.)
 */
export function useSocketConnection() {
  const isAuthenticated = useAuthStore(s => s.isAuthenticated);
  const updateCredits = useAuthStore(s => s.updateCredits);

  const setRoom = useGameStore(s => s.setRoom);
  const addPlayer = useGameStore(s => s.addPlayer);
  const removePlayer = useGameStore(s => s.removePlayer);
  const setPlayers = useGameStore(s => s.setPlayers);
  const setHost = useGameStore(s => s.setHost);
  const addMessage = useGameStore(s => s.addMessage);
  const setConnectionStatus = useGameStore(s => s.setConnectionStatus);
  const setHangmanUpdate = useGameStore(s => s.setHangmanUpdate);
  const setTttUpdate = useGameStore(s => s.setTttUpdate);
  const setTttRoundResult = useGameStore(s => s.setTttRoundResult);
  const setFnStatus = useGameStore(s => s.setFnStatus);
  const setFnSlowmo = useGameStore(s => s.setFnSlowmo);
  const setFnRoundResult = useGameStore(s => s.setFnRoundResult);

  useEffect(() => {
    if (!isAuthenticated) {
      socket.disconnect();
      return;
    }

    socket.setStatusHandler((status) => {
      setConnectionStatus(status);
    });

    socket.connect();

    return () => {
      socket.disconnect();
    };
  }, [isAuthenticated, setConnectionStatus]);

  // connected — update credits from server
  useSocketEvent('connected', useCallback((data) => {
    if (typeof data.credits === 'number') {
      updateCredits(data.credits as number);
    }
  }, [updateCredits]));

  // Room events
  useSocketEvent('room_created', useCallback((data) => {
    setRoom(data.roomId as string, [], true, (data.gameType as GameType) ?? 'doodle');
  }, [setRoom]));

  useSocketEvent('room_joined', useCallback((data) => {
    const players = mapPlayers(data.players);
    const isHost = players.some(p => p.id === socket.socketId && p.isHost);
    setRoom(data.roomId as string, players, isHost, (data.gameType as GameType) ?? 'doodle');
  }, [setRoom]));

  useSocketEvent('player_joined', useCallback((data) => {
    addPlayer(mapPlayer(data.player as Record<string, unknown>));
  }, [addPlayer]));

  useSocketEvent('player_left', useCallback((data) => {
    const player = mapPlayer(data.player as Record<string, unknown>);
    removePlayer(player.id);
    if (data.newHost === socket.socketId) {
      setHost(true);
    }
  }, [removePlayer, setHost]));

  useSocketEvent('player_list', useCallback((data) => {
    setPlayers(mapPlayers(data.players));
  }, [setPlayers]));

  useSocketEvent('chat_message', useCallback((data) => {
    addMessage({
      id: createMsgId(),
      player: data.player as string | undefined,
      text: data.text as string,
      type: (data.isSystem ? 'system' : 'chat') as 'chat' | 'system',
      timestamp: Date.now(),
    });
  }, [addMessage]));

  useSocketEvent('credits_deducted', useCallback((data) => {
    updateCredits(data.remaining as number);
  }, [updateCredits]));

  // Hangman events
  useSocketEvent('hangman_update', useCallback((data) => {
    setHangmanUpdate(
      data.revealedWord as string[],
      data.wrongGuesses as number,
      data.guessedLetters as string[],
      data.maxWrongGuesses as number,
    );
  }, [setHangmanUpdate]));

  // Tic-Tac-Toe events
  useSocketEvent('ttt_update', useCallback((data) => {
    setTttUpdate(
      data.board as string[],
      data.currentMark as 'X' | 'O',
      data.playerX as string,
      data.playerO as string,
      data.playerXName as string,
      data.playerOName as string,
      data.lastMove as { cell: number; mark: string; player: string } | undefined,
    );
  }, [setTttUpdate]));

  useSocketEvent('ttt_round_result', useCallback((data) => {
    setTttRoundResult(
      data.result as 'X' | 'O' | 'draw',
      data.winLine as number[] | null,
      data.board as string[],
      data.roundWins as { X: number; O: number },
    );
  }, [setTttRoundResult]));

  // Fruit Ninja events
  useSocketEvent('fn_status', useCallback((data) => {
    setFnStatus(
      data.scores as Record<string, number>,
      data.lives as Record<string, number>,
    );
  }, [setFnStatus]));

  useSocketEvent('fn_slowmo', useCallback((data) => {
    setFnSlowmo(data.player as string, data.active as boolean);
  }, [setFnSlowmo]));

  useSocketEvent('fn_round_result', useCallback((data) => {
    setFnRoundResult(
      data.scores as Record<string, number>,
      data.roundWins as Record<string, number>,
      (data.winner as string) ?? null,
    );
  }, [setFnRoundResult]));
}
