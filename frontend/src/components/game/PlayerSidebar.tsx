/* ── Player Sidebar (Game Arena left panel) ── */

import { useGameStore } from '../../stores/gameStore';
import { Avatar, Icon } from '../ui';

export default function PlayerSidebar() {
  const players = useGameStore(s => s.players);

  return (
    <aside className="hidden md:flex flex-col w-72 bg-purple-900/40 backdrop-blur-md rounded-3xl border-4 border-purple-800/50 shadow-2xl overflow-hidden shrink-0 z-10">
      <div className="p-4 bg-purple-800/50 border-b-2 border-purple-700/50">
        <h3 className="text-lg font-black uppercase tracking-wider text-purple-100 flex items-center drop-shadow-md">
          <Icon name="groups" className="mr-2" />
          Players
        </h3>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-3 scrollbar-hide">
        {players.map((player, idx) => {
          const isDrawing = player.isDrawing;
          const rank = idx + 1;

          return (
            <div
              key={player.id}
              className={`flex items-center p-2 rounded-2xl transition-all
                ${isDrawing
                  ? 'bg-blue-50 border-b-4 border-blue-300 shadow-lg ring-2 ring-blue-400 scale-[1.03]'
                  : 'bg-white border-b-4 border-gray-200 hover:scale-[1.02] shadow-lg'
                }
              `}
            >
              <div className="relative ml-1">
                <Avatar
                  src={player.avatar}
                  username={player.username}
                  size={48}
                  borderColor={isDrawing ? 'border-blue-500' : 'border-purple-500'}
                  className={isDrawing ? 'animate-bounce-slight' : ''}
                />
                {rank <= 3 && (
                  <div className={`absolute -top-1 -right-1 text-black border border-black text-[10px] font-black px-1.5 rounded-full shadow-sm z-10 rotate-12
                    ${rank === 1 ? 'bg-yellow-400' : rank === 2 ? 'bg-gray-300' : 'bg-amber-600 text-white'}
                  `}>
                    #{rank}
                  </div>
                )}
                {isDrawing && (
                  <div className="absolute -bottom-1 -right-1 bg-green-400 text-white border-2 border-white p-0.5 rounded-full shadow-sm z-10">
                    <Icon name="edit" className="text-[10px] block" />
                  </div>
                )}
              </div>
              <div className="ml-3 flex-1 min-w-0">
                <div className="flex flex-col">
                  <span className="font-black text-slate-800 text-base leading-tight truncate">{player.username}</span>
                  {player.location?.name && (
                    <span className="text-[10px] font-bold text-gray-400 truncate flex items-center gap-0.5 leading-tight">
                      <Icon name="location_on" className="text-[10px]" />{player.location.name}
                    </span>
                  )}
                  {player.isHost && (
                    <span className="inline-block px-2 py-0.5 rounded-full bg-yellow-300 border border-yellow-500 text-yellow-900 text-[9px] font-bold uppercase tracking-wide w-max mt-0.5 shadow-sm">
                      Host
                    </span>
                  )}
                  {isDrawing && (
                    <div className="text-xs font-bold text-blue-500 mt-0.5 animate-pulse">Drawing...</div>
                  )}
                </div>
              </div>
              <div className="font-display font-black text-purple-600 text-xl pr-2">
                {player.score}
              </div>
            </div>
          );
        })}
      </div>
    </aside>
  );
}
