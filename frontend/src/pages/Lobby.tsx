/* ── Lobby (Waiting Room) – Shared for all game types ── */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { socket } from '../lib/socket';
import { useGameStore, createMsgId } from '../stores/gameStore';
import { useAuthStore } from '../stores/authStore';
import { useSocketEvent } from '../hooks/useSocket';
import { ComicCard, GameBtn, Icon, Avatar } from '../components/ui';
import { toast } from 'sonner';
import { useCallback } from 'react';

const GAME_LABELS: Record<string, { label: string; color: string; icon: string }> = {
  doodle: { label: 'DOODLE DASH', color: 'bg-purple-500 text-white', icon: 'brush' },
  hangman: { label: 'HANGMAN', color: 'bg-orange-500 text-white', icon: 'text_fields' },
  tictactoe: { label: 'TIC TAC TOE', color: 'bg-indigo-500 text-white', icon: 'grid_3x3' },
  fruitninja: { label: 'FRUIT NINJA', color: 'bg-emerald-500 text-white', icon: 'sports_martial_arts' },
};

export default function Lobby() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const roomId = useGameStore(s => s.roomId);
  const gameType = useGameStore(s => s.gameType);
  const players = useGameStore(s => s.players);
  const isHost = useGameStore(s => s.isHost);
  const connectionStatus = useGameStore(s => s.connectionStatus);
  const leaveRoom = useGameStore(s => s.leaveRoom);
  const addMessage = useGameStore(s => s.addMessage);

  const [copied, setCopied] = useState(false);
  const [starting, setStarting] = useState(false);

  // If no room, redirect home
  useEffect(() => {
    if (!roomId) navigate('/', { replace: true });
  }, [roomId, navigate]);

  // Navigate to game when it starts
  useSocketEvent('game_starting', useCallback(() => {
    navigate('/game');
  }, [navigate]));

  // Room error toasts
  useSocketEvent('room_error', useCallback((data) => {
    toast.error(data.message as string);
    setStarting(false);
  }, []));

  // Player join/leave system messages
  useSocketEvent('player_joined', useCallback((data) => {
    const player = data.player as { username: string };
    addMessage({
      id: createMsgId(),
      text: `${player.username} joined the room!`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [addMessage]));

  useSocketEvent('player_left', useCallback((data) => {
    const player = data.player as { username: string };
    addMessage({
      id: createMsgId(),
      text: `${player.username} left the room`,
      type: 'system',
      timestamp: Date.now(),
    });
  }, [addMessage]));

  const handleStart = () => {
    setStarting(true);
    socket.send('start_game');
  };

  const handleLeave = () => {
    socket.send('leave_room');
    leaveRoom();
    navigate('/');
  };

  const copyCode = async () => {
    if (!roomId) return;
    try {
      await navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (!roomId) return null;

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <ComicCard className="max-w-lg w-full p-8 text-center" borderColor="border-purple-400">
        {/* Lobby Title */}
        <div className="mb-6">
          {gameType && GAME_LABELS[gameType] && (
            <div className={`inline-flex items-center gap-1.5 ${GAME_LABELS[gameType]!.color} font-black text-xs px-4 py-1.5 rounded-full border-2 border-black shadow-chunky-sm mb-3 uppercase tracking-wider`}>
              <Icon name={GAME_LABELS[gameType]!.icon} className="text-sm" />
              {GAME_LABELS[gameType]!.label}
            </div>
          )}
          <Icon name="meeting_room" filled className="text-5xl text-purple-500 mb-2" />
          <h1 className="font-display font-black text-3xl text-dark-outline">GAME LOBBY</h1>
          <p className="text-gray-500 font-bold text-sm mt-1">Waiting for players...</p>
        </div>

        {/* Room Code */}
        <div className="bg-purple-50 border-3 border-purple-300 rounded-2xl p-4 mb-6">
          <p className="text-xs font-bold text-purple-400 uppercase mb-2">Room Code</p>
          <div className="flex items-center justify-center gap-2">
            <span className="font-display font-black text-3xl tracking-[0.3em] text-purple-700">{roomId}</span>
            <button
              onClick={copyCode}
              className="p-2 rounded-xl bg-purple-200 hover:bg-purple-300 text-purple-700 transition-colors"
            >
              <Icon name={copied ? 'check' : 'content_copy'} className="text-xl" />
            </button>
          </div>
          <p className="text-xs text-purple-400 font-bold mt-2">Share this code with friends!</p>
        </div>

        {/* Players */}
        <div className="mb-6">
          <h3 className="font-display font-black text-sm text-gray-500 uppercase mb-3 flex items-center justify-center gap-2">
            <Icon name="groups" className="text-lg" />
            Players ({players.length}/8)
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {players.map(player => (
              <div
                key={player.id}
                className={`flex items-center gap-3 p-3 bg-white rounded-xl border-2 shadow-md ${
                  player.id === socket.socketId ? 'border-accent' : 'border-gray-200'
                }`}
              >
                <Avatar src={player.avatar} username={player.username} size={40} borderColor="border-purple-400" />
                <div className="text-left min-w-0 flex-1">
                  <div className="font-bold text-sm text-slate-800 truncate">{player.username}</div>
                  {player.location?.name && (
                    <div className="text-[10px] font-bold text-gray-400 truncate flex items-center gap-0.5">
                      <Icon name="location_on" className="text-[10px]" />{player.location.name}
                    </div>
                  )}
                  <div className="flex gap-1 mt-0.5">
                    {player.isHost && (
                      <span className="text-[10px] font-bold text-yellow-600 bg-yellow-100 px-2 py-0.5 rounded-full border border-yellow-300">
                        HOST
                      </span>
                    )}
                    {player.id === socket.socketId && !player.isHost && (
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full border border-blue-300">
                        YOU
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty slots */}
            {Array.from({ length: Math.max(0, 2 - players.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex items-center justify-center p-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-300">
                <Icon name="person_add" className="text-2xl mr-2" />
                <span className="font-bold text-sm">Empty</span>
              </div>
            ))}
          </div>
        </div>

        {/* Min players warning */}
        {players.length < 2 && (
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-3 mb-4 flex items-center gap-2">
            <Icon name="warning" filled className="text-xl text-yellow-600" />
            <span className="text-sm font-bold text-yellow-700">Need at least 2 players to start</span>
          </div>
        )}

        {/* Credit cost notice */}
        <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-3 mb-6 flex items-center gap-2">
          <Icon name="monetization_on" filled className="text-xl text-blue-500" />
          <span className="text-sm font-bold text-blue-600">100 credits per player to start</span>
          {user && (
            <span className="ml-auto font-display font-black text-blue-700">{user.credits} <span className="text-xs font-bold">credits</span></span>
          )}
        </div>

        {/* Connection status */}
        {connectionStatus !== 'connected' && (
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 mb-4 animate-pulse">
            <span className="text-sm font-bold text-red-600">
              <Icon name="wifi_off" className="text-lg mr-1 align-middle" />
              {connectionStatus === 'connecting' ? 'Reconnecting...' : 'Disconnected'}
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          {isHost && (
            <GameBtn
              variant="green"
              size="xl"
              fullWidth
              onClick={handleStart}
              disabled={players.length < 2 || starting || connectionStatus !== 'connected'}
            >
              <Icon name="play_arrow" className="text-2xl" />
              {starting ? 'STARTING...' : 'START GAME'}
            </GameBtn>
          )}
          <GameBtn
            variant="red"
            size={isHost ? 'xl' : 'xl'}
            fullWidth={!isHost}
            onClick={handleLeave}
          >
            <Icon name="logout" className="text-2xl" />
            LEAVE
          </GameBtn>
        </div>
      </ComicCard>
    </div>
  );
}
