/* ── FnCanvas.tsx — React wrapper for the Fruit Ninja 3D canvas engine ── */

import { useRef, useEffect, useCallback } from 'react';
import FnEngine from './FnEngine';
import type { ServerCube } from './FnEngine';
import { socket } from '../../lib/socket';
import { useSocketEvent } from '../../hooks/useSocket';

interface Props {
  className?: string;
}

export default function FnCanvas({ className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<FnEngine | null>(null);
  const rafRef    = useRef(0);
  const sliced    = useRef<Set<number>>(new Set());

  /* ── bootstrap engine + game loop ── */
  useEffect(() => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext('2d');
    if (!ctx) return;

    const engine = new FnEngine();
    engineRef.current = engine;

    /* Resize (DPR-aware) */
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const { width: cw, height: ch } = cvs.getBoundingClientRect();
      cvs.width  = cw * dpr;
      cvs.height = ch * dpr;
      engine.resize(cw, ch);
    };
    resize();

    const ro = new ResizeObserver(resize);
    ro.observe(cvs);

    /* Animation loop */
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(now - last, 50);
      last = now;

      engine.update(dt);

      /* drain cubes that fell off-screen → server miss */
      const missed = engine.drainMissed();
      for (const id of missed) {
        if (!sliced.current.has(id)) {
          socket.send('fn_miss', { cubeId: id });
        }
      }

      /* render */
      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      engine.render(ctx);

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
      engine.clear();
      engineRef.current = null;
    };
  }, []);

  /* ── Socket → engine ── */

  useSocketEvent('fn_spawn', useCallback((data: Record<string, unknown>) => {
    if (!engineRef.current) return;
    const cube = data.cube as Record<string, unknown>;
    if (cube.targetPlayer !== socket.socketId) return;
    engineRef.current.addCube(cube as unknown as ServerCube);
  }, []));

  useSocketEvent('fn_hit', useCallback((data: Record<string, unknown>) => {
    if (!engineRef.current) return;
    if ((data.slicedBy as string) !== socket.socketId) return;
    const cubeId = data.cubeId as number;
    engineRef.current.hitCube(cubeId, data.destroyed as boolean, data.newHealth as number);
    /* allow re-hit for strong cubes (or clean up destroyed) */
    sliced.current.delete(cubeId);
  }, []));

  useSocketEvent('fn_miss', useCallback((data: Record<string, unknown>) => {
    if (!engineRef.current) return;
    if ((data.player as string) === socket.socketId) {
      engineRef.current.removeCube(data.cubeId as number);
    }
  }, []));

  useSocketEvent('fn_slowmo', useCallback((data: Record<string, unknown>) => {
    if (!engineRef.current) return;
    if ((data.player as string) === socket.socketId) {
      engineRef.current.setSlowmo(data.active as boolean);
    }
  }, []));

  /* clear engine on new round */
  useSocketEvent('round_start', useCallback(() => {
    engineRef.current?.clear();
    sliced.current.clear();
  }, []));

  /* ── Pointer events ── */

  const pos = (e: React.PointerEvent) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const trySlice = (px: number, py: number) => {
    if (!engineRef.current) return;
    const hit = engineRef.current.checkHit(px, py);
    if (hit && !sliced.current.has(hit.cubeId)) {
      sliced.current.add(hit.cubeId);
      engineRef.current.sparkAt(hit.screenX, hit.screenY);
      socket.send('fn_slice', { cubeId: hit.cubeId });
    }
  };

  const onDown = (e: React.PointerEvent) => {
    const p = pos(e);
    engineRef.current?.pointerDown(p.x, p.y);
    trySlice(p.x, p.y);
  };

  const onMove = (e: React.PointerEvent) => {
    const p = pos(e);
    if (e.buttons > 0 || e.pressure > 0) {
      engineRef.current?.pointerMove(p.x, p.y);
      trySlice(p.x, p.y);
    }
  };

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ width: '100%', height: '100%', touchAction: 'none', display: 'block' }}
      onPointerDown={onDown}
      onPointerMove={onMove}
    />
  );
}
