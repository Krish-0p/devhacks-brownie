/* ── Tic-Tac-Toe Game Arena ── */

import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, createMsgId } from '../stores/gameStore';
import { useSocketEvent } from '../hooks/useSocket';
import { socket } from '../lib/socket';
import { Icon } from '../components/ui';
import PlayerSidebar from '../components/game/PlayerSidebar';
import GameChat from '../components/game/GameChat';
import { RoundEndModal, GameEndModal } from '../components/game/GameModals';
import TttBoard from '../components/tictactoe/TttBoard';
import TttScoreboard from '../components/tictactoe/TttScoreboard';
import type { LeaderboardEntry } from '../lib/types';
import { mapPlayers } from '../hooks/useSocket';

const MAX_TIME = 15; // matches TICTACTOE_CONFIG.turnTime
const TOTAL_ROUNDS = 5;

export default function TicTacToeGame() {
  const navigate = useNavigate();

  /* ── shared state ── */
  const roomId = useGameStore(s => s.roomId);
  const players = useGameStore(s => s.players);
  const currentRound = useGameStore(s => s.currentRound);
  const maxRounds = useGameStore(s => s.maxRounds);
  const timeLeft = useGameStore(s => s.timeLeft);
  const connectionStatus = useGameStore(s => s.connectionStatus);

  /* ── TTT-specific state ── */
  const tttBoard = useGameStore(s => s.tttBoard);
  const tttCurrentMark = useGameStore(s => s.tttCurrentMark);
  const tttPlayerX = useGameStore(s => s.tttPlayerX);
  const tttPlayerO = useGameStore(s => s.tttPlayerO);
  const tttPlayerXName = useGameStore(s => s.tttPlayerXName);
  const tttPlayerOName = useGameStore(s => s.tttPlayerOName);
  const tttWinLine = useGameStore(s => s.tttWinLine);
  const tttRoundResult = useGameStore(s => s.tttRoundResult);
  const tttRoundWins = useGameStore(s => s.tttRoundWins);

  /* ── actions ── */
  const setRound = useGameStore(s => s.setRound);
  const updateTimer = useGameStore(s => s.updateTimer);
  const setMaxTime = useGameStore(s => s.setMaxTime);
  const setDrawing = useGameStore(s => s.setDrawing);
  const setPlayers = useGameStore(s => s.setPlayers);
  const addMessage = useGameStore(s => s.addMessage);
  const showModal = useGameStore(s => s.showModal);
  const leaveRoom = useGameStore(s => s.leaveRoom);

  // Redirect if no room
  useEffect(() => {
    if (!roomId) navigate('/', { replace: true });
  }, [roomId, navigate]);

  /* ── Derived values ── */
  const myId = socket.socketId;
  const myMark: 'X' | 'O' | null =
    myId === tttPlayerX ? 'X' : myId === tttPlayerO ? 'O' : null;
  const isMyTurn = myMark === tttCurrentMark;
  const disabled = tttRoundResult !== null; // board frozen after result

  /* ── Player locations ── */
  const playerXLoc = players.find(p => p.id === tttPlayerX)?.location?.name;
  const playerOLoc = players.find(p => p.id === tttPlayerO)?.location?.name;

  /* ── Socket event handlers ── */

  useSocketEvent('game_starting', useCallback((data) => {
    const totalRounds = data.totalRounds as number;
    setRound(1, totalRounds, 0, 0);
    setMaxTime(MAX_TIME);
    setDrawing(false);
    addMessage({
      id: createMsgId(),
      text: `Game starting! Best of ${totalRounds} — first to 3 wins.`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [setRound, setMaxTime, setDrawing, addMessage]));

  // ttt_update and ttt_round_result are handled globally in useSocket.ts

  useSocketEvent('round_start', useCallback((data) => {
    const round = data.round as number;
    setRound(round, useGameStore.getState().maxRounds, 0, 0);
    addMessage({
      id: createMsgId(),
      text: `Round ${round} — fight!`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [setRound, addMessage]));

  useSocketEvent('timer_update', useCallback((data) => {
    updateTimer(data.timeLeft as number);
  }, [updateTimer]));

  useSocketEvent('round_end', useCallback((data) => {
    const word = data.word as string;
    const leaderboard = data.leaderboard as LeaderboardEntry[];
    showModal({ type: 'roundEnd', word, leaderboard });
    addMessage({
      id: createMsgId(),
      text: word ? `Round over — ${word}` : 'Round over!',
      type: 'round-over',
      timestamp: Date.now(),
    });
    setTimeout(() => {
      const m = useGameStore.getState().modal;
      if (m.type === 'roundEnd') useGameStore.getState().hideModal();
    }, 5000);
  }, [showModal, addMessage]));

  useSocketEvent('game_end', useCallback((data) => {
    const leaderboard = data.leaderboard as LeaderboardEntry[];
    const winner = data.winner as string;
    showModal({ type: 'gameEnd', leaderboard, winner });
  }, [showModal]));

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

  /* ── Leave handler ── */
  const handleLeave = () => {
    socket.send('leave_room');
    leaveRoom();
    navigate('/');
  };

  /* ── Timer helpers ── */
  const timerPct = MAX_TIME > 0 ? (timeLeft / MAX_TIME) * 100 : 0;
  const timerColor = timeLeft > 8 ? 'text-green-400' : timeLeft > 4 ? 'text-yellow-400' : 'text-red-400';
  const timerBg = timeLeft > 8 ? 'bg-green-400' : timeLeft > 4 ? 'bg-yellow-400' : 'bg-red-400';

  /* ── Turn indicator text ── */
  const turnText = tttRoundResult
    ? tttRoundResult === 'draw'
      ? "It's a draw!"
      : tttRoundResult === myMark
        ? 'You win this round!'
        : 'Opponent wins this round!'
    : isMyTurn
      ? 'Your turn — pick a cell!'
      : "Opponent's turn…";

  if (!roomId) return null;

  return (
    <div className="h-screen flex flex-col p-2 md:p-4 gap-3 overflow-hidden">
      {/* ── Top Bar ── */}
      <header className="flex items-center justify-between gap-3 z-20">
        {/* Left: round info */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-indigo-800/60 backdrop-blur-md px-4 py-2 rounded-2xl border-2 border-indigo-600/50 flex items-center gap-2 shadow-lg">
            <Icon name="grid_3x3" className="text-xl text-accent" />
            <span className="font-display font-black text-white text-sm">
              TIC TAC TOE
            </span>
          </div>
        </div>

        {/* Center: turn indicator */}
        <div className="flex-1 flex justify-center">
          <div className={`
            border-4 border-black rounded-2xl px-6 py-2 shadow-[4px_4px_0_0_rgba(0,0,0,1)]
            max-w-sm w-full text-center transform -rotate-1
            ${isMyTurn && !tttRoundResult ? 'bg-indigo-400 animate-pulse' : 'bg-cyan-300'}
          `}>
            <p className="font-display font-black text-black text-sm md:text-lg leading-tight">
              {turnText}
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
          <div className="hidden lg:block w-32 bg-indigo-900/40 rounded-full h-3 border border-indigo-700/50 overflow-hidden">
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

      {/* ── Main Layout: Sidebar | Board Area | Chat ── */}
      <div className="flex-1 flex flex-col md:flex-row gap-3 min-h-0 overflow-hidden">
        <PlayerSidebar />

        {/* Center: TTT game area */}
        <section className="flex-1 flex flex-col items-center justify-center bg-gradient-to-b from-indigo-50 to-white rounded-3xl shadow-[0_0_40px_-5px_rgba(0,0,0,0.6)] overflow-hidden relative border-4 border-indigo-200 z-0 min-h-0 p-4 gap-4">
          {/* Scoreboard */}
          <TttScoreboard
            round={currentRound}
            totalRounds={maxRounds || TOTAL_ROUNDS}
            playerXName={tttPlayerXName}
            playerOName={tttPlayerOName}
            playerXLocation={playerXLoc}
            playerOLocation={playerOLoc}
            roundWins={tttRoundWins}
            currentMark={tttCurrentMark}
            myMark={myMark}
          />

          {/* Board */}
          <div className="flex-1 flex items-center justify-center w-full max-w-xs">
            <TttBoard
              board={tttBoard}
              currentMark={tttCurrentMark}
              isMyTurn={isMyTurn}
              myMark={myMark}
              winLine={tttWinLine}
              disabled={disabled}
            />
          </div>

          {/* Your mark badge */}
          {myMark && (
            <div className={`
              px-4 py-1.5 rounded-xl font-black text-sm border-2 shadow-lg
              ${myMark === 'X'
                ? 'bg-red-100 text-red-600 border-red-300'
                : 'bg-blue-100 text-blue-600 border-blue-300'
              }
            `}>
              You are <span className="text-lg">{myMark === 'X' ? '✕' : '○'}</span>
            </div>
          )}
        </section>

        <GameChat />
      </div>

      {/* ── Modals ── */}
      <RoundEndModal />
      <GameEndModal />
    </div>
  );
}
