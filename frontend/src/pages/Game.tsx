/* ── Game Arena – Doodle Dash ── */

import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, createMsgId } from '../stores/gameStore';
import { useSocketEvent } from '../hooks/useSocket';
import { socket } from '../lib/socket';
import { Icon } from '../components/ui';
import PlayerSidebar from '../components/game/PlayerSidebar';
import GameCanvas from '../components/game/GameCanvas';
import GameChat from '../components/game/GameChat';
import WordPickerModal from '../components/game/WordPickerModal';
import { RoundEndModal, GameEndModal } from '../components/game/GameModals';
import type { LeaderboardEntry } from '../lib/types';
import { mapPlayers } from '../hooks/useSocket';

const MAX_TIME = 60; // matches GAME_CONFIG.roundTime

export default function Game() {
  const navigate = useNavigate();

  const roomId = useGameStore(s => s.roomId);
  const currentRound = useGameStore(s => s.currentRound);
  const maxRounds = useGameStore(s => s.maxRounds);
  const currentTurn = useGameStore(s => s.currentTurn);
  const totalTurns = useGameStore(s => s.totalTurns);
  const timeLeft = useGameStore(s => s.timeLeft);
  const amDrawing = useGameStore(s => s.amDrawing);
  const wordDisplay = useGameStore(s => s.wordDisplay);
  const connectionStatus = useGameStore(s => s.connectionStatus);

  const setRound = useGameStore(s => s.setRound);
  const updateTimer = useGameStore(s => s.updateTimer);
  const setMaxTime = useGameStore(s => s.setMaxTime);
  const setDrawing = useGameStore(s => s.setDrawing);
  const setWordHint = useGameStore(s => s.setWordHint);
  const setPlayers = useGameStore(s => s.setPlayers);
  const addMessage = useGameStore(s => s.addMessage);
  const showModal = useGameStore(s => s.showModal);
  const leaveRoom = useGameStore(s => s.leaveRoom);

  // If no room, redirect home
  useEffect(() => {
    if (!roomId) navigate('/', { replace: true });
  }, [roomId, navigate]);

  // ── Socket event handlers ──

  useSocketEvent('game_starting', useCallback((data) => {
    const totalRounds = data.totalRounds as number;
    setRound(1, totalRounds, 0, 0);
    setMaxTime(MAX_TIME);
    setDrawing(false);
    addMessage({
      id: createMsgId(),
      text: `Game starting! ${totalRounds} rounds.`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [setRound, setMaxTime, setDrawing, addMessage]));

  useSocketEvent('pick_word', useCallback((data) => {
    const words = data.words as string[];
    showModal({ type: 'wordPicker', words });
  }, [showModal]));

  useSocketEvent('round_start', useCallback((data) => {
    const round = data.round as number;
    const drawer = data.drawer as string;
    const totalTurns = data.totalTurns as number;
    const currentTurn = data.currentTurn as number;
    setRound(round, useGameStore.getState().maxRounds, currentTurn, totalTurns);
    addMessage({
      id: createMsgId(),
      text: `${drawer} is drawing!`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [setRound, addMessage]));

  useSocketEvent('you_are_drawing', useCallback((data) => {
    const word = data.word as string;
    setDrawing(true, word);
    addMessage({
      id: createMsgId(),
      text: `You're drawing: ${word}`,
      type: 'hint',
      timestamp: Date.now(),
    });
  }, [setDrawing, addMessage]));

  useSocketEvent('word_hint', useCallback((data) => {
    const hint = data.hint as string;
    setWordHint(hint);
    setDrawing(false);
  }, [setWordHint, setDrawing]));

  useSocketEvent('timer_update', useCallback((data) => {
    updateTimer(data.timeLeft as number);
  }, [updateTimer]));

  useSocketEvent('correct_guess', useCallback((data) => {
    const player = data.player as string;
    addMessage({
      id: createMsgId(),
      text: `${player} guessed correctly! (+${data.score})`,
      type: 'correct',
      timestamp: Date.now(),
    });
    // Update player list will come separately
  }, [addMessage]));

  useSocketEvent('close_guess', useCallback((data) => {
    addMessage({
      id: createMsgId(),
      text: data.text as string,
      type: 'close',
      timestamp: Date.now(),
    });
  }, [addMessage]));

  useSocketEvent('round_end', useCallback((data) => {
    const word = data.word as string;
    const leaderboard = data.leaderboard as LeaderboardEntry[];
    setDrawing(false);
    showModal({ type: 'roundEnd', word, leaderboard });
    addMessage({
      id: createMsgId(),
      text: `The word was: ${word}`,
      type: 'round-over',
      timestamp: Date.now(),
    });
    // Auto-dismiss after 5s
    setTimeout(() => {
      const m = useGameStore.getState().modal;
      if (m.type === 'roundEnd') useGameStore.getState().hideModal();
    }, 5000);
  }, [setDrawing, showModal, addMessage]));

  useSocketEvent('game_end', useCallback((data) => {
    const leaderboard = data.leaderboard as LeaderboardEntry[];
    const winner = data.winner as string;
    setDrawing(false);
    showModal({ type: 'gameEnd', leaderboard, winner });
  }, [setDrawing, showModal]));

  useSocketEvent('player_list', useCallback((data) => {
    setPlayers(mapPlayers(data.players));
  }, [setPlayers]));

  useSocketEvent('room_error', useCallback((data) => {
    addMessage({
      id: createMsgId(),
      text: data.message as string,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [addMessage]));

  // ── Leave handler ──
  const handleLeave = () => {
    socket.send('leave_room');
    leaveRoom();
    navigate('/');
  };

  // ── Timer progress ──
  const timerPct = MAX_TIME > 0 ? (timeLeft / MAX_TIME) * 100 : 0;
  const timerColor = timeLeft > 20 ? 'text-green-400' : timeLeft > 10 ? 'text-yellow-400' : 'text-red-400';
  const timerBg = timeLeft > 20 ? 'bg-green-400' : timeLeft > 10 ? 'bg-yellow-400' : 'bg-red-400';

  if (!roomId) return null;

  return (
    <div className="h-screen flex flex-col p-2 md:p-4 gap-3 overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between gap-3 z-20">
        {/* Left: round info */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-purple-800/60 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-purple-600/50 flex items-center gap-2 shadow-lg">
            <Icon name="refresh" className="text-xl text-accent" />
            <span className="font-display font-black text-white text-sm">
              Round <span className="text-accent">{currentRound}</span>/{maxRounds}
            </span>
          </div>
          {totalTurns > 0 && (
            <div className="bg-purple-800/60 backdrop-blur-md px-3 py-2 rounded-2xl border-2 border-purple-600/50 text-purple-200 text-xs font-bold shadow-lg hidden sm:block">
              Turn {currentTurn}/{totalTurns}
            </div>
          )}
        </div>

        {/* Center: word display */}
        <div className="flex-1 flex justify-center">
          <div className="bg-yellow-400 border-4 border-black rounded-2xl px-6 py-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)] max-w-sm w-full text-center transform -rotate-1">
            <p className="font-display font-black text-black text-lg md:text-2xl tracking-[0.25em] leading-tight">
              {wordDisplay || (amDrawing ? 'Pick a word!' : '_ _ _ _ _')}
            </p>
          </div>
        </div>

        {/* Right: timer + leave */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Timer circle */}
          <div className="relative flex items-center justify-center w-14 h-14 shrink-0">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 56 56">
              <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.1)" strokeWidth="4" fill="none" />
              <circle
                cx="28" cy="28" r="24"
                stroke="currentColor"
                strokeWidth="4"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${2 * Math.PI * 24}`}
                strokeDashoffset={`${2 * Math.PI * 24 * (1 - timerPct / 100)}`}
                className={`${timerColor} transition-all duration-1000 ease-linear`}
              />
            </svg>
            <span className={`font-display font-black text-lg ${timerColor}`}>{timeLeft}</span>
          </div>

          {/* Timer bar (wider screens) */}
          <div className="hidden lg:block w-32 bg-purple-900/40 rounded-full h-3 border border-purple-700/50 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerBg}`} style={{ width: `${timerPct}%` }} />
          </div>

          {/* Leave button */}
          <button
            onClick={handleLeave}
            className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl px-4 py-2 text-sm border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all transform active:translate-y-0.5 active:shadow-none flex items-center gap-1"
          >
            <Icon name="logout" className="text-lg" />
            <span className="hidden sm:inline">LEAVE</span>
          </button>
        </div>
      </header>

      {/* Connection warning */}
      {connectionStatus !== 'connected' && (
        <div className="bg-red-500/90 text-white text-center py-2 px-4 rounded-xl font-bold text-sm animate-pulse border-2 border-red-600">
          <Icon name="wifi_off" className="text-lg mr-2 align-middle" />
          {connectionStatus === 'connecting' ? 'Reconnecting...' : 'Disconnected — trying to reconnect'}
        </div>
      )}

      {/* ── Main Layout: Sidebar | Canvas | Chat ── */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 overflow-hidden">
        <PlayerSidebar />
        <GameCanvas />
        <GameChat />
      </div>

      {/* ── Modals ── */}
      <WordPickerModal />
      <RoundEndModal />
      <GameEndModal />
    </div>
  );
}
