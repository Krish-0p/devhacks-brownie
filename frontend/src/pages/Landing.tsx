/* ── Landing Page — Game Selection ── */

import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Icon, Avatar } from '../components/ui';
import { useGameStore } from '../stores/gameStore';

const GAMES = [
  {
    id: 'doodle',
    title: 'DOODLE DASH',
    subtitle: 'Draw & Guess!',
    description: 'One player draws, everyone else guesses. Can you sketch fast enough?',
    icon: 'brush',
    bgColor: 'bg-gradient-to-br from-purple-400 via-pink-400 to-orange-300',
    borderColor: 'border-purple-600',
    shadowColor: 'shadow-[8px_8px_0px_0px_#7C3AED]',
    hoverShadow: 'hover:shadow-[10px_10px_0px_0px_#7C3AED]',
    accentBg: 'bg-purple-500',
    route: '/doodle',
    badge: '🎨',
    players: '2-8 Players',
    cost: '100 Credits',
  },
  {
    id: 'hangman',
    title: 'HANGMAN',
    subtitle: 'Guess the Word!',
    description: 'One player picks a word, everyone guesses letters. Don\'t let the man hang!',
    icon: 'text_fields',
    bgColor: 'bg-gradient-to-br from-orange-400 via-red-400 to-pink-400',
    borderColor: 'border-orange-600',
    shadowColor: 'shadow-[8px_8px_0px_0px_#EA580C]',
    hoverShadow: 'hover:shadow-[10px_10px_0px_0px_#EA580C]',
    accentBg: 'bg-orange-500',
    route: '/hangman',
    badge: '💀',
    players: '2-8 Players',
    cost: '100 Credits',
  },
  {
    id: 'tictactoe',
    title: 'TIC TAC TOE',
    subtitle: 'X vs O!',
    description: 'Classic 2-player showdown. Outsmart your opponent in a best-of-5 battle!',
    icon: 'grid_3x3',
    bgColor: 'bg-gradient-to-br from-indigo-400 via-blue-400 to-cyan-300',
    borderColor: 'border-indigo-600',
    shadowColor: 'shadow-[8px_8px_0px_0px_#4F46E5]',
    hoverShadow: 'hover:shadow-[10px_10px_0px_0px_#4F46E5]',
    accentBg: 'bg-indigo-500',
    route: '/tictactoe',
    badge: '❌',
    players: '2 Players',
    cost: '100 Credits',
  },
  {
    id: 'fruitninja',
    title: 'FRUIT NINJA',
    subtitle: 'Slash & Score!',
    description: 'Slice cubes in a 3D arena! Compete head-to-head in a best-of-3 slashing battle!',
    icon: 'sports_martial_arts',
    bgColor: 'bg-gradient-to-br from-emerald-400 via-green-400 to-lime-300',
    borderColor: 'border-emerald-600',
    shadowColor: 'shadow-[8px_8px_0px_0px_#059669]',
    hoverShadow: 'hover:shadow-[10px_10px_0px_0px_#059669]',
    accentBg: 'bg-emerald-500',
    route: '/fruitninja',
    badge: '🗡️',
    players: '2 Players',
    cost: '100 Credits',
  },
] as const;

export default function Landing() {
  const navigate = useNavigate();
  const user = useAuthStore(s => s.user);
  const logout = useAuthStore(s => s.logout);
  const connectionStatus = useGameStore(s => s.connectionStatus);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-4 selection:bg-neon-green selection:text-black overflow-x-hidden">
      {/* Header */}
      <header className="w-full pt-4 pb-6 flex flex-col items-center justify-center space-y-2 z-10">
        <div className="relative transform hover:scale-105 transition-transform duration-300 group">
          <div className="absolute -top-8 -left-12 text-yellow-400 group-hover:rotate-12 transition-transform hidden md:block">
            <Icon name="star" filled className="text-6xl drop-shadow-[3px_3px_0_#000]" />
          </div>
          <div className="absolute -bottom-4 -right-14 text-secondary group-hover:-rotate-12 transition-transform hidden md:block">
            <Icon name="sports_esports" filled className="text-6xl drop-shadow-[3px_3px_0_#000]" />
          </div>
          <h1 className="text-6xl md:text-7xl font-black font-display tracking-wide text-white logo-text flex items-center justify-center flex-wrap gap-x-4 gap-y-0 leading-none">
            <span className="text-white transform -rotate-2 inline-block">DOODLE</span>
            <span className="text-secondary transform rotate-2 inline-block">DASH</span>
          </h1>
        </div>
        <div className="bg-white/10 backdrop-blur-sm px-6 py-2 rounded-full border-2 border-white/20 shadow-lg transform rotate-1 hover:rotate-0 transition-transform cursor-default">
          <p className="text-white font-display font-bold text-lg md:text-xl tracking-wide drop-shadow-[2px_2px_0_#000]">
            Pick a game & start playing!
          </p>
        </div>
      </header>

      {/* Avatar + Credits Bar */}
      <div className="w-full max-w-3xl flex items-center justify-between mb-8 z-10 px-2">
        <div className="flex items-center gap-3">
          <Avatar
            src={user?.avatar}
            username={user?.username}
            size={48}
            borderColor="border-dark-outline"
          />
          <div>
            <p className="font-display font-black text-white text-lg leading-tight">{user?.username || 'Player'}</p>
            <div className="flex items-center gap-1">
              <Icon name="monetization_on" filled className="text-yellow-400 text-sm" />
              <span className="font-bold text-yellow-300 text-xs">{user?.credits ?? 0} credits</span>
            </div>
          </div>
        </div>

        {/* Quick nav */}
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/credits')}
            className="bg-yellow-400 hover:bg-yellow-300 text-black font-black rounded-xl border-2 border-black px-3 py-2 text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
          >
            <Icon name="add" className="text-base" /> Credits
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="bg-purple-400 hover:bg-purple-300 text-black font-black rounded-xl border-2 border-black px-3 py-2 text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
          >
            <Icon name="person" className="text-base" /> Profile
          </button>
          <button
            onClick={() => navigate('/nearby')}
            className="bg-cyan-400 hover:bg-cyan-300 text-black font-black rounded-xl border-2 border-black px-3 py-2 text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all hidden sm:flex items-center gap-1"
          >
            <Icon name="trophy" className="text-base" /> Nearby
          </button>
          <button
            onClick={handleLogout}
            className="bg-red-400 hover:bg-red-300 text-black font-black rounded-xl border-2 border-black px-3 py-2 text-xs shadow-[3px_3px_0_0_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all flex items-center gap-1"
          >
            <Icon name="logout" className="text-base" />
          </button>
        </div>
      </div>

      {/* Game Cards */}
      <main className="flex-grow flex items-start justify-center w-full max-w-3xl z-10 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full">
          {GAMES.map((game) => (
            <button
              key={game.id}
              onClick={() => navigate(game.route)}
              className={`group relative bg-white rounded-3xl border-4 border-black ${game.shadowColor} ${game.hoverShadow} hover:-translate-y-2 hover:rotate-0 transition-all duration-300 overflow-hidden text-left
                ${game.id === 'doodle' ? 'transform -rotate-1' : 'transform rotate-1'}
              `}
            >
              {/* Top colored area */}
              <div className={`${game.bgColor} p-8 relative overflow-hidden`}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(white 2px, transparent 2px)', backgroundSize: '12px 12px' }} />
                <div className="relative flex items-center justify-between">
                  <div>
                    <span className="text-5xl mb-2 block">{game.badge}</span>
                    <h2 className="font-display font-black text-3xl text-white drop-shadow-[3px_3px_0_#000]">{game.title}</h2>
                    <p className="font-bold text-white/90 text-lg drop-shadow-md">{game.subtitle}</p>
                  </div>
                  <Icon
                    name={game.icon}
                    filled
                    className="text-white/30 text-[80px] absolute -right-2 -bottom-4 transform group-hover:scale-110 transition-transform"
                  />
                </div>
              </div>

              {/* Bottom info area */}
              <div className="p-6">
                <p className="text-gray-600 font-bold text-sm mb-4">{game.description}</p>
                <div className="flex items-center gap-3">
                  <span className="bg-blue-100 text-blue-700 font-black text-xs px-3 py-1 rounded-full border-2 border-blue-200">
                    <Icon name="groups" className="text-sm align-middle mr-1" />{game.players}
                  </span>
                  <span className="bg-yellow-100 text-yellow-700 font-black text-xs px-3 py-1 rounded-full border-2 border-yellow-200">
                    <Icon name="monetization_on" className="text-sm align-middle mr-1" />{game.cost}
                  </span>
                </div>
                <div className={`mt-4 ${game.accentBg} text-white font-black text-center py-3 rounded-xl border-2 border-black shadow-[3px_3px_0_0_rgba(0,0,0,1)] group-hover:translate-y-0.5 group-hover:shadow-[1px_1px_0_0_rgba(0,0,0,1)] transition-all text-lg tracking-wider`}>
                  PLAY NOW
                </div>
              </div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer — Online Status */}
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
