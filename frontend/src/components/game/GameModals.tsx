/* ── Round End / Game End Modals ── */

import { useGameStore } from '../../stores/gameStore';
import { socket } from '../../lib/socket';
import { Modal, GameBtn, Icon, Avatar } from '../ui';
import { useNavigate } from 'react-router-dom';

export function RoundEndModal() {
  const modal = useGameStore(s => s.modal);

  if (modal.type !== 'roundEnd') return null;

  return (
    <Modal open className="max-w-md">
      <h2 className="text-2xl font-display font-black text-center text-dark-outline mb-1">ROUND OVER!</h2>
      {modal.word && (
        <p className="text-center mb-4">
          <span className="text-gray-500 font-bold text-sm">The word was </span>
          <span className="font-display font-black text-primary text-lg">{modal.word}</span>
        </p>
      )}
      <div className="space-y-2 max-h-60 overflow-y-auto">
        {modal.leaderboard?.map((entry, i) => (
          <div key={entry.id} className="flex items-center p-3 bg-gray-50 rounded-xl border-2 border-gray-200">
            <span className={`font-display font-black text-xl w-8 text-center
              ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}
            `}>
              {i + 1}
            </span>
            <Avatar src={entry.avatar} username={entry.username} size={36} className="ml-2" />
            <span className="ml-3 font-bold text-slate-800 flex-1">{entry.username}</span>
            {entry.roundScore !== undefined && entry.roundScore > 0 && (
              <span className="text-green-500 font-black text-sm mr-3">+{entry.roundScore}</span>
            )}
            <span className="font-display font-black text-purple-600">{entry.score}</span>
          </div>
        ))}
      </div>
    </Modal>
  );
}

export function GameEndModal() {
  const navigate = useNavigate();
  const modal = useGameStore(s => s.modal);
  const hideModal = useGameStore(s => s.hideModal);
  const leaveRoom = useGameStore(s => s.leaveRoom);

  if (modal.type !== 'gameEnd') return null;

  const handlePlayAgain = () => {
    socket.send('play_again');
    hideModal();
  };

  const handleLeave = () => {
    socket.send('leave_room');
    hideModal();
    leaveRoom();
    navigate('/');
  };

  return (
    <Modal open className="max-w-md">
      <div className="text-center mb-4">
        <Icon name="emoji_events" filled className="text-accent text-6xl drop-shadow-md" />
        <h2 className="text-3xl font-display font-black text-dark-outline mt-2">GAME OVER!</h2>
        {modal.winner && (
          <p className="text-gray-500 font-bold mt-1">
            <span className="text-primary font-black">{modal.winner}</span> wins!
          </p>
        )}
      </div>

      <div className="space-y-2 max-h-60 overflow-y-auto mb-6">
        {modal.leaderboard?.map((entry, i) => (
          <div key={entry.id} className={`flex items-center p-3 rounded-xl border-2
            ${i === 0 ? 'bg-yellow-50 border-yellow-400' : i === 1 ? 'bg-gray-50 border-gray-300' : i === 2 ? 'bg-amber-50 border-amber-400' : 'bg-gray-50 border-gray-200'}
          `}>
            <span className={`font-display font-black text-2xl w-10 text-center
              ${i === 0 ? 'text-yellow-500' : i === 1 ? 'text-gray-400' : i === 2 ? 'text-amber-600' : 'text-gray-300'}
            `}>
              {i === 0 ? '👑' : i + 1}
            </span>
            <Avatar src={entry.avatar} username={entry.username} size={40} className="ml-2" />
            <span className="ml-3 font-bold text-slate-800 flex-1 text-lg">{entry.username}</span>
            <span className="font-display font-black text-purple-600 text-xl">{entry.score}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <GameBtn variant="green" size="lg" fullWidth onClick={handlePlayAgain}>
          <Icon name="replay" className="text-2xl" />
          PLAY AGAIN
        </GameBtn>
        <GameBtn variant="red" size="lg" fullWidth onClick={handleLeave}>
          <Icon name="logout" className="text-2xl" />
          LEAVE
        </GameBtn>
      </div>
    </Modal>
  );
}
