/* ── Game Chat Panel ── */

import { useState, useRef, useEffect, type FormEvent } from 'react';
import { socket } from '../../lib/socket';
import { useGameStore } from '../../stores/gameStore';
import { Icon } from '../ui';

export default function GameChat() {
  const messages = useGameStore(s => s.messages);
  const amDrawing = useGameStore(s => s.amDrawing);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [text, setText] = useState('');

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages]);

  const handleSend = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || amDrawing) return;
    socket.send('guess', { text: text.trim() });
    setText('');
  };

  return (
    <aside className="flex flex-col w-full md:w-80 bg-purple-900/40 backdrop-blur-md rounded-3xl border-4 border-purple-800/50 shadow-2xl overflow-hidden shrink-0 z-10 h-64 md:h-full min-h-0">
      {/* Header */}
      <div className="bg-purple-800/50 p-3 text-center border-b-2 border-purple-700/50">
        <p className="text-xs font-bold text-purple-200 uppercase tracking-widest flex justify-center items-center gap-1">
          <Icon name="chat_bubble" className="text-sm" /> Game Chat
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide flex flex-col">
        {messages.map(msg => {
          if (msg.type === 'correct') {
            return (
              <div key={msg.id} className="text-center my-1">
                <span className="inline-block px-4 py-1.5 bg-green-500 text-white text-xs font-black rounded-full border-2 border-green-600 shadow-md transform -rotate-1">
                  {msg.text}
                </span>
              </div>
            );
          }
          if (msg.type === 'round-over') {
            return (
              <div key={msg.id} className="bg-green-100/90 border-l-4 border-green-500 rounded-r-lg p-2 text-center shadow-sm">
                <span className="text-xs font-bold text-green-700 block mb-1 uppercase">Round Over</span>
                <span className="text-sm text-green-900 font-bold">{msg.text}</span>
              </div>
            );
          }
          if (msg.type === 'hint' || msg.type === 'close') {
            return (
              <div key={msg.id} className="bg-yellow-100/90 border-l-4 border-yellow-500 rounded-r-lg p-2 text-center shadow-sm mx-4">
                <span className="text-xs font-bold text-yellow-700 block mb-1 uppercase">
                  {msg.type === 'close' ? 'Close!' : 'Hint'}
                </span>
                <span className="text-sm text-yellow-900 font-bold">{msg.text}</span>
              </div>
            );
          }
          if (msg.type === 'system') {
            return (
              <div key={msg.id} className="text-center my-1">
                <span className="inline-block px-3 py-1 bg-purple-500/50 text-purple-100 text-xs font-bold rounded-full">
                  {msg.text}
                </span>
              </div>
            );
          }
          // Normal chat message
          return (
            <div key={msg.id} className="flex flex-col items-start space-y-1">
              <span className="text-[10px] font-bold text-purple-200 ml-2">{msg.player}</span>
              <div className="bg-white rounded-2xl rounded-tl-none px-4 py-2 text-sm text-slate-800 font-bold shadow-md max-w-[90%] border-b-4 border-gray-200">
                {msg.text}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-3 bg-purple-800/50 border-t-2 border-purple-700/50">
        <form className="flex space-x-2" onSubmit={handleSend}>
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            disabled={amDrawing}
            placeholder={amDrawing ? 'You are drawing...' : 'Type guess...'}
            className="flex-1 bg-purple-900/60 border-2 border-purple-600/50 text-white font-bold text-sm rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent placeholder-purple-300/50 transition-all shadow-inner"
          />
          <button
            type="submit"
            disabled={amDrawing}
            className="bg-accent hover:bg-yellow-300 text-slate-900 font-black rounded-xl px-4 py-2 text-sm shadow-[0_4px_0_0_rgb(180,83,9)] transition-all transform active:translate-y-1 active:shadow-none border-2 border-black disabled:opacity-50"
          >
            SEND
          </button>
        </form>
      </div>
    </aside>
  );
}
