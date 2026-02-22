/* ── Game Canvas with Drawing Tools ── */

import { useRef, useEffect, useCallback, useState } from 'react';
import { socket } from '../../lib/socket';
import { useGameStore } from '../../stores/gameStore';
import { useSocketEvent } from '../../hooks/useSocket';
import { Icon } from '../ui';

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#FBBF24', '#22C55E', '#A855F7', '#F97316', '#EC4899', '#06B6D4', '#8B5CF6', '#F59E0B', '#FFFFFF'];

interface DrawData {
  x: number;
  y: number;
  color: string;
  strokeWidth: number;
  drawType: 'start' | 'draw' | 'end';
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const amDrawing = useGameStore(s => s.amDrawing);

  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentWidth, setCurrentWidth] = useState(6);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef({ x: 0, y: 0 });

  // Resize canvas to fit container
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      // Use fixed logical size for consistent coordinates
      canvas.width = 800;
      canvas.height = 540;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getCanvasPos = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const drawLine = useCallback((x1: number, y1: number, x2: number, y2: number, color: string, width: number) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }, []);

  // Handle remote draw events
  useSocketEvent('draw', useCallback((data: Record<string, unknown>) => {
    const d = data as unknown as DrawData;
    if (d.drawType === 'start' || d.drawType === 'draw') {
      if (d.drawType === 'start') {
        lastPosRef.current = { x: d.x, y: d.y };
      }
      drawLine(lastPosRef.current.x, lastPosRef.current.y, d.x, d.y, d.color, d.strokeWidth);
      lastPosRef.current = { x: d.x, y: d.y };
    }
  }, [drawLine]));

  useSocketEvent('clear_canvas', useCallback(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
  }, []));

  // Local drawing handlers
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if (!amDrawing) return;
    isDrawingRef.current = true;
    const pos = getCanvasPos(e.clientX, e.clientY);
    lastPosRef.current = pos;
    socket.send('draw', { x: pos.x, y: pos.y, color: currentColor, strokeWidth: currentWidth, drawType: 'start' });
    drawLine(pos.x, pos.y, pos.x, pos.y, currentColor, currentWidth);
  }, [amDrawing, currentColor, currentWidth, getCanvasPos, drawLine]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!amDrawing || !isDrawingRef.current) return;
    const pos = getCanvasPos(e.clientX, e.clientY);
    drawLine(lastPosRef.current.x, lastPosRef.current.y, pos.x, pos.y, currentColor, currentWidth);
    socket.send('draw', { x: pos.x, y: pos.y, color: currentColor, strokeWidth: currentWidth, drawType: 'draw' });
    lastPosRef.current = pos;
  }, [amDrawing, currentColor, currentWidth, getCanvasPos, drawLine]);

  const onPointerUp = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    socket.send('draw', { x: 0, y: 0, color: currentColor, strokeWidth: currentWidth, drawType: 'end' });
  }, [currentColor, currentWidth]);

  const handleClear = () => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx || !canvasRef.current) return;
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.send('clear_canvas');
  };

  return (
    <section className="flex-1 flex flex-col bg-white rounded-3xl shadow-[0_0_40px_-5px_rgba(0,0,0,0.6)] overflow-hidden relative border-8 border-white z-0 min-h-0">
      {/* Floating toolbar (for drawer only) */}
      {amDrawing && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex items-center gap-2 bg-slate-800 p-2 rounded-2xl shadow-xl border-2 border-slate-600 z-10 transition-transform hover:scale-105">
          {COLORS.slice(0, 4).map(c => (
            <button
              key={c}
              onClick={() => setCurrentColor(c)}
              className={`w-9 h-9 rounded-full hover:scale-110 transition-transform border-2 border-white cursor-pointer shadow-sm
                ${currentColor === c ? 'ring-2 ring-accent scale-110' : ''}
              `}
              style={{ backgroundColor: c, boxShadow: currentColor === c ? `0 0 0 2px ${c}` : undefined }}
            />
          ))}
          <div className="h-6 w-0.5 bg-slate-600 mx-1" />
          {COLORS.slice(4, 8).map(c => (
            <button
              key={c}
              onClick={() => setCurrentColor(c)}
              className={`w-9 h-9 rounded-full hover:scale-110 transition-transform border-2 border-white cursor-pointer shadow-sm
                ${currentColor === c ? 'ring-2 ring-accent scale-110' : ''}
              `}
              style={{ backgroundColor: c }}
            />
          ))}
          <div className="h-6 w-0.5 bg-slate-600 mx-1" />
          {/* Stroke widths */}
          {[4, 8, 14].map(w => (
            <button
              key={w}
              onClick={() => setCurrentWidth(w)}
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors
                ${currentWidth === w ? 'bg-accent text-black' : 'bg-slate-700 text-slate-400 hover:bg-slate-600'}
              `}
            >
              <div className="rounded-full bg-current" style={{ width: w, height: w }} />
            </button>
          ))}
          <div className="h-6 w-0.5 bg-slate-600 mx-1" />
          <button
            onClick={handleClear}
            className="w-9 h-9 rounded-xl bg-slate-700 hover:bg-red-500 hover:text-white text-slate-400 flex items-center justify-center transition-colors"
          >
            <Icon name="delete" className="text-xl" />
          </button>
        </div>
      )}

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 w-full h-full relative">
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 ${amDrawing ? 'cursor-crosshair' : 'cursor-default'}`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        />
        {!amDrawing && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none mix-blend-multiply">
            <span className="font-display text-5xl font-black text-slate-300 opacity-20 -rotate-6">Watch & Guess!</span>
          </div>
        )}
      </div>
    </section>
  );
}
