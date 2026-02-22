/* ── Word Picker Modal ── */

import { useGameStore } from '../../stores/gameStore';
import { socket } from '../../lib/socket';
import { Modal, GameBtn } from '../ui';

const WORD_COLORS: Array<'blue' | 'green' | 'orange'> = ['blue', 'green', 'orange'];

export default function WordPickerModal() {
  const modal = useGameStore(s => s.modal);
  const hideModal = useGameStore(s => s.hideModal);

  if (modal.type !== 'wordPicker' || !modal.words) return null;

  const handlePick = (word: string) => {
    socket.send('select_word', { word });
    hideModal();
  };

  return (
    <Modal open onClose={undefined} className="max-w-lg w-full">
      <h2 className="text-2xl font-display font-black text-center text-dark-outline mb-2">PICK A WORD!</h2>
      <p className="text-center text-gray-500 font-bold text-sm mb-6">Choose what to draw</p>
      <div className="flex flex-wrap justify-center gap-3">
        {modal.words.map((word, i) => (
          <GameBtn
            key={word}
            variant={WORD_COLORS[i % WORD_COLORS.length]}
            size="md"
            onClick={() => handlePick(word)}
            className="whitespace-nowrap text-xs sm:text-sm min-w-0"
          >
            {word.toUpperCase()}
          </GameBtn>
        ))}
      </div>
    </Modal>
  );
}
