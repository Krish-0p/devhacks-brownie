/* ── Fruit Ninja Game Page — Full-screen canvas arena ── */

import { useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore, createMsgId } from '../stores/gameStore';
import { useSocketEvent, mapPlayers } from '../hooks/useSocket';
import { socket } from '../lib/socket';
import { Icon, GameBtn, Modal } from '../components/ui';
import FnCanvas from '../components/fruitninja/FnCanvas';
import FnHud from '../components/fruitninja/FnHud';
import FnScoreboard from '../components/fruitninja/FnScoreboard';
import type { LeaderboardEntry } from '../lib/types';

export default function FruitNinjaGame() {
  const navigate = useNavigate();

  /* ── shared state ── */
  const roomId           = useGameStore(s => s.roomId);
  const connectionStatus = useGameStore(s => s.connectionStatus);
  const modal            = useGameStore(s => s.modal);

  /* ── actions ── */
  const setRound       = useGameStore(s => s.setRound);
  const updateTimer    = useGameStore(s => s.updateTimer);
  const setMaxTime     = useGameStore(s => s.setMaxTime);
  const setPlayers     = useGameStore(s => s.setPlayers);
  const addMessage     = useGameStore(s => s.addMessage);
  const showModal      = useGameStore(s => s.showModal);
  const hideModal      = useGameStore(s => s.hideModal);
  const leaveRoom      = useGameStore(s => s.leaveRoom);
  const clearFnRoundResult = useGameStore(s => s.clearFnRoundResult);

  /* redirect if no room */
  useEffect(() => {
    if (!roomId) navigate('/', { replace: true });
  }, [roomId, navigate]);

  /* ── Socket events — game lifecycle ── */

  useSocketEvent('game_starting', useCallback((data) => {
    const totalRounds = (data.totalRounds as number) ?? 3;
    setRound(1, totalRounds, 0, 0);
    setMaxTime(60);
    clearFnRoundResult();
    addMessage({
      id: createMsgId(),
      text: `Game starting! Best of ${totalRounds} — first to 2 wins.`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [setRound, setMaxTime, clearFnRoundResult, addMessage]));

  useSocketEvent('round_start', useCallback((data) => {
    const round = data.round as number;
    const total = (data.totalRounds as number) || useGameStore.getState().maxRounds || 3;
    setRound(round, total, 0, 0);
    clearFnRoundResult();
  }, [setRound, clearFnRoundResult]));

  useSocketEvent('timer_update', useCallback((data) => {
    updateTimer(data.timeLeft as number);
  }, [updateTimer]));

  useSocketEvent('round_end', useCallback(() => {
    /* fn_round_result already handled globally → FnScoreboard shows it */
    /* auto-dismiss scoreboard after 5s */
    setTimeout(() => {
      clearFnRoundResult();
    }, 5000);
  }, [clearFnRoundResult]));

  useSocketEvent('game_end', useCallback((data) => {
    const leaderboard = data.leaderboard as LeaderboardEntry[];
    const winner = data.winner as string;
    showModal({ type: 'gameEnd', leaderboard, winner });
  }, [showModal]));

  useSocketEvent('player_list', useCallback((data) => {
    setPlayers(mapPlayers(data.players));
  }, [setPlayers]));

  /* ── Leave ── */
  const handleLeave = () => {
    socket.send('leave_room');
    leaveRoom();
    navigate('/');
  };

  const handlePlayAgain = () => {
    hideModal();
    clearFnRoundResult();
    socket.send('play_again');
  };

  if (!roomId) return null;

  const isGameEnd = modal.type === 'gameEnd';
  const myId = socket.socketId;
  const iWon = isGameEnd && modal.winner === myId;

  return (
    <div className="h-screen w-screen relative overflow-hidden bg-black">
      {/* ── Canvas (z-0) ── */}
      <FnCanvas className="absolute inset-0 z-0" />

      {/* ── HUD (z-10) ── */}
      <FnHud />

      {/* ── Between-round scoreboard (z-30) ── */}
      <FnScoreboard />

      {/* ── Leave button (z-20) ── */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={handleLeave}
          className="bg-red-500 hover:bg-red-600 text-white font-black rounded-xl px-3 py-2 text-xs border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] transition-all active:translate-y-0.5 active:shadow-none flex items-center gap-1"
        >
          <Icon name="logout" className="text-base" />
          <span className="hidden sm:inline">LEAVE</span>
        </button>
      </div>

      {/* ── Connection warning ── */}
      {connectionStatus !== 'connected' && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 bg-red-500/90 text-white text-center py-2 px-5 rounded-xl font-bold text-sm animate-pulse border-2 border-red-600">
          <Icon name="wifi_off" className="text-lg mr-2 align-middle" />
          {connectionStatus === 'connecting' ? 'Reconnecting…' : 'Disconnected'}
        </div>
      )}

      {/* ── Game-End modal (z-40) ── */}
      <Modal open={isGameEnd} className="max-w-md z-40">
        <div className="text-center">
          <span className="text-5xl block mb-2">{iWon ? '🏆' : '🎮'}</span>
          <h2 className="font-display font-black text-3xl text-dark-outline mb-1">
            {iWon ? 'VICTORY!' : 'GAME OVER'}
          </h2>
          <p className="text-gray-500 font-bold text-sm mb-6">
            {iWon ? 'You slashed your way to the top!' : 'Better luck next time!'}
          </p>

          {/* Leaderboard */}
          {modal.leaderboard?.map((entry: LeaderboardEntry, i: number) => (
            <div
              key={entry.id ?? i}
              className={`flex items-center gap-3 mb-2 p-3 rounded-xl border-2 ${
                i === 0 ? 'bg-yellow-100 border-yellow-400' : 'bg-gray-100 border-gray-200'
              }`}
            >
              <span className="font-display font-black text-lg text-dark-outline w-6">{i + 1}.</span>
              <span className="font-display font-black text-dark-outline flex-1 text-left truncate">{entry.username}</span>
              <span className="font-display font-black text-emerald-600">{entry.score} pts</span>
            </div>
          ))}

          {/* Buttons */}
          <div className="flex gap-3 mt-6">
            <GameBtn variant="green" size="lg" fullWidth onClick={handlePlayAgain}>
              <Icon name="replay" className="text-xl mr-1" /> PLAY AGAIN
            </GameBtn>
            <GameBtn variant="red" size="lg" fullWidth onClick={handleLeave}>
              <Icon name="logout" className="text-xl mr-1" /> LEAVE
            </GameBtn>
          </div>
        </div>
      </Modal>
    </div>
  );
}
