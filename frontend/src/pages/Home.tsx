/* ── Game Home (Create/Join Room) – Supports Doodle & Hangman ── */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGameStore } from '../stores/gameStore';
import type { GameType } from '../stores/gameStore';
import { useSocketEvent } from '../hooks/useSocket';
import { socket } from '../lib/socket';
import { GameBtn, Icon, Avatar } from '../components/ui';
import { toast } from 'sonner';

const GAME_META: Record<GameType, { title: string; titleAccent: string; subtitle: string; icon: string; accentColor: string; bgClass: string }> = {
  doodle: {
    title: 'DOODLE',
    titleAccent: 'DASH',
    subtitle: 'Draw, Guess & Have a Blast!',
    icon: 'brush',
    accentColor: 'text-secondary',
    bgClass: 'bg-pink-400',
  },
  hangman: {
    title: 'HANG',
    titleAccent: 'MAN',
    subtitle: 'Pick letters & Guess the Word!',
    icon: 'text_fields',
    accentColor: 'text-orange-400',
    bgClass: 'bg-orange-400',
  },
  tictactoe: {
    title: 'TIC TAC',
    titleAccent: 'TOE',
    subtitle: 'Classic X vs O — Best of 5!',
    icon: 'grid_3x3',
    accentColor: 'text-indigo-400',
    bgClass: 'bg-indigo-400',
  },
  fruitninja: {
    title: 'FRUIT',
    titleAccent: 'NINJA',
    subtitle: 'Slash cubes — Best of 3!',
    icon: 'sports_martial_arts',
    accentColor: 'text-emerald-400',
    bgClass: 'bg-emerald-400',
  },
};

interface HomeProps {
  gameType: GameType;
}

export default function Home({ gameType }: HomeProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const user = useAuthStore(s => s.user);
  const roomId = useGameStore(s => s.roomId);
  const connectionStatus = useGameStore(s => s.connectionStatus);
  const meta = GAME_META[gameType];

  const [roomCode, setRoomCode] = useState('');
  const [joining, setJoining] = useState(false);

  // Handle ?credits=success redirect
  useEffect(() => {
    if (searchParams.get('credits') === 'success') {
      toast.success('Credits purchased successfully!');
      navigate('/', { replace: true });
    }
  }, [searchParams, navigate]);

  // Navigate to lobby once room is set
  useEffect(() => {
    if (roomId) {
      navigate('/lobby');
    }
  }, [roomId, navigate]);

  // Socket events for room errors
  useSocketEvent('room_error', useCallback((data) => {
    toast.error(data.message as string);
    setJoining(false);
  }, []));

  // Navigate to game if game_starting fires while on home
  useSocketEvent('game_starting', useCallback(() => {
    navigate('/game');
  }, [navigate]));

  const handleCreateRoom = () => {
    socket.send('create_room', { gameType });
  };

  const handleJoin = () => {
    if (!roomCode.trim()) return;
    setJoining(true);
    socket.send('join_room', { roomId: roomCode.trim().toUpperCase() });
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 selection:bg-neon-green selection:text-black overflow-x-hidden">
      {/* Header / Logo */}
      <header className="w-full pt-4 pb-8 flex flex-col items-center justify-center space-y-2 z-10">
        <div className="relative transform hover:scale-105 transition-transform duration-300 group">
          {/* Star decoration */}
          <div className="absolute -top-8 -left-12 text-yellow-400 group-hover:rotate-12 transition-transform hidden md:block">
            <Icon name="star" filled className="text-6xl drop-shadow-[3px_3px_0_#000]" />
          </div>
          {/* Icon decoration */}
          <div className="absolute -bottom-4 -right-14 text-secondary group-hover:-rotate-12 transition-transform hidden md:block">
            <Icon name={meta.icon} filled className="text-6xl drop-shadow-[3px_3px_0_#000]" />
          </div>
          <h1 className="text-7xl md:text-8xl font-black font-display tracking-wide text-white logo-text flex items-center justify-center flex-wrap gap-x-4 gap-y-0 leading-none">
            <span className="text-white transform -rotate-2 inline-block">{meta.title}</span>
            <span className={`${meta.accentColor} transform rotate-2 inline-block`}>{meta.titleAccent}</span>
          </h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-white/20 shadow-lg transform rotate-1 hover:rotate-0 transition-transform cursor-default">
          <p className="text-white font-display font-bold text-xl md:text-2xl tracking-wide drop-shadow-[2px_2px_0_#000]">
            {meta.subtitle}
          </p>
        </div>
      </header>

      {/* Main Card */}
      <main className="flex-grow flex items-center justify-center w-full max-w-lg z-10 mb-8">
        <div className="w-full bg-surface-card rounded-3xl p-6 md:p-8 border-4 border-dark-outline shadow-chunky-lg relative overflow-visible">

          {/* Avatar Section */}
          <div className="bg-blue-50 rounded-2xl p-6 mb-6 border-4 border-dark-outline shadow-chunky-sm relative">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-accent text-dark-outline font-black px-6 py-1.5 rounded-full border-2 border-dark-outline text-sm uppercase tracking-wider shadow-chunky-sm whitespace-nowrap z-10">
              Your Avatar
            </div>
            <div className="flex items-center justify-center mt-2 gap-4">
              <div className="flex flex-col items-center flex-grow">
                <Avatar
                  src={user?.avatar}
                  username={user?.username}
                  size={128}
                  borderColor="border-dark-outline"
                  className="mb-3 shadow-inner-chunky"
                />
                <div className="relative">
                  <div className="font-display font-black text-xl text-center text-dark-outline bg-white px-4 py-2 rounded-xl border-4 border-dark-outline w-full max-w-[200px] shadow-chunky-sm">
                    {user?.username || 'Player'}
                  </div>
                </div>
                {/* Credits display */}
                <div className="mt-2 flex items-center gap-2 bg-yellow-100 px-3 py-1 rounded-full border-2 border-yellow-300">
                  <Icon name="monetization_on" filled className="text-yellow-600 text-lg" />
                  <span className="font-black text-yellow-800 text-sm">{user?.credits ?? 0} credits</span>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4 mb-6">
            <GameBtn variant="green" size="xl" fullWidth onClick={handleCreateRoom} className="group relative overflow-hidden">
              <span className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 skew-y-12" />
              <Icon name="play_circle" filled className="text-4xl group-hover:scale-110 transition-transform z-10" />
              <span className="z-10">PLAY NOW</span>
            </GameBtn>

            <GameBtn variant="orange" size="lg" fullWidth onClick={handleCreateRoom}>
              <Icon name="add_circle" className="text-3xl group-hover:rotate-90 transition-transform" />
              CREATE ROOM
            </GameBtn>
          </div>

          {/* Divider */}
          <div className="relative py-2 mb-4">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t-4 border-dark-outline border-dashed opacity-30" />
            </div>
            <div className="relative flex justify-center">
              <span className="bg-surface-card px-2 text-sm text-gray-500 font-bold uppercase">Or join friend</span>
            </div>
          </div>

          {/* Room Code Join */}
          <div className="flex gap-2 mb-6">
            <input
              value={roomCode}
              onChange={e => setRoomCode(e.target.value.toUpperCase())}
              placeholder="ENTER CODE..."
              className="flex-1 bg-gray-100 border-4 border-dark-outline text-dark-outline font-black text-xl placeholder-gray-400 rounded-2xl py-3 px-4 focus:ring-0 focus:bg-white focus:border-primary uppercase transition-all shadow-inner-chunky outline-none"
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
            />
            <button
              onClick={handleJoin}
              disabled={joining}
              className="bg-primary hover:bg-purple-600 text-white font-bold rounded-2xl border-4 border-dark-outline px-6 py-3 shadow-chunky active:translate-y-1 active:shadow-none transition-all"
            >
              JOIN
            </button>
          </div>

          {/* Bottom Navigation Grid */}
          <div className="grid grid-cols-4 gap-2">
            <button
              onClick={() => navigate('/credits')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-yellow-200 hover:bg-yellow-300 border-2 border-dark-outline shadow-chunky-sm active:translate-y-0.5 active:shadow-none transition-all group h-20"
            >
              <Icon name="monetization_on" className="text-yellow-800 text-2xl mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-dark-outline leading-tight">Shop</span>
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-purple-200 hover:bg-purple-300 border-2 border-dark-outline shadow-chunky-sm active:translate-y-0.5 active:shadow-none transition-all group h-20"
            >
              <Icon name="person" className="text-purple-800 text-2xl mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-dark-outline leading-tight">Profile</span>
            </button>
            <button
              onClick={() => navigate('/nearby')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-cyan-200 hover:bg-cyan-300 border-2 border-dark-outline shadow-chunky-sm active:translate-y-0.5 active:shadow-none transition-all group h-20"
            >
              <Icon name="trophy" className="text-cyan-800 text-2xl mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-dark-outline leading-tight">Nearby</span>
            </button>
            <button
              onClick={() => navigate('/')}
              className="flex flex-col items-center justify-center p-2 rounded-xl bg-blue-200 hover:bg-blue-300 border-2 border-dark-outline shadow-chunky-sm active:translate-y-0.5 active:shadow-none transition-all group h-20"
            >
              <Icon name="arrow_back" className="text-blue-800 text-2xl mb-1 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-black uppercase text-dark-outline leading-tight">Games</span>
            </button>
          </div>

          {/* Floating decorations */}
          <div className="absolute -top-6 -right-6 w-14 h-14 bg-pink-400 rounded-full border-4 border-dark-outline shadow-chunky flex items-center justify-center z-20 animate-bounce hidden md:flex">
            <Icon name={gameType === 'hangman' ? 'text_fields' : 'palette'} className="text-white text-3xl drop-shadow-md" />
          </div>
          <div className="absolute -bottom-5 -left-5 w-12 h-12 bg-blue-400 rounded-full border-4 border-dark-outline shadow-chunky flex items-center justify-center z-20 animate-bounce hidden md:flex" style={{ animationDelay: '150ms' }}>
            <Icon name={gameType === 'hangman' ? 'psychology' : 'videogame_asset'} className="text-white text-2xl drop-shadow-md" />
          </div>
        </div>
      </main>

      {/* Footer — Online Count */}
      <footer className="py-4 flex justify-center w-full z-10 mb-4">
        <div className="flex items-center space-x-3 bg-dark-outline text-white py-2 px-6 rounded-xl shadow-lg border-b-4 border-black/40 hover:-translate-y-1 transition-transform cursor-pointer">
          <div className="relative flex h-3 w-3">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${connectionStatus === 'connected' ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className={`relative inline-flex rounded-full h-3 w-3 border border-white ${connectionStatus === 'connected' ? 'bg-neon-green' : 'bg-red-500'}`} />
          </div>
          <span className="text-xs md:text-sm font-bold tracking-wide font-display">
            {connectionStatus === 'connected' ? 'CONNECTED' : connectionStatus === 'connecting' ? 'CONNECTING...' : 'OFFLINE'}
          </span>
        </div>
      </footer>
    </div>
  );
}
