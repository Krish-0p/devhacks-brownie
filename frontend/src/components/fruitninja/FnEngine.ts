/* ── FnEngine.ts — 3D Cube-Slashing Render Engine ──
 *
 * Pure TypeScript – no React / DOM deps.
 * Manages cubes, fragments, sparks, trail, slow-mo.
 * Canvas component feeds it server events and pointer input.
 */

// ═══════════════════════════════════════════════════════
//  Public types
// ═══════════════════════════════════════════════════════

export interface ServerCube {
  id: number;
  x: number;        // 0–100 % of viewport width
  y: number;        // >100 = below screen
  xD: number;       // velocity (% per tick @ 60 fps)
  yD: number;
  color: string;    // "blue"|"green"|"pink"|"orange"
  health: number;
  wireframe: boolean;
}

export interface HitResult {
  cubeId: number;
  screenX: number;  // CSS px
  screenY: number;
}

// ═══════════════════════════════════════════════════════
//  Internal types
// ═══════════════════════════════════════════════════════

interface RGB { r: number; g: number; b: number }
interface V3  { x: number; y: number; z: number }

interface Cube {
  id: number;
  x: number; y: number;
  xD: number; yD: number;
  rX: number; rY: number; rZ: number;
  rXd: number; rYd: number; rZd: number;
  color: RGB;
  health: number;
  maxHp: number;
  wire: boolean;
  entered: boolean;
  flash: number;
}

interface Frag {
  x: number; y: number;
  xD: number; yD: number;
  rot: number; rotD: number;
  size: number;
  life: number;
  color: RGB;
}

interface Spark {
  x: number; y: number;
  xD: number; yD: number;
  life: number;
  color: RGB;
}

interface Trail {
  x: number; y: number;
  life: number;
}

// ═══════════════════════════════════════════════════════
//  Constants
// ═══════════════════════════════════════════════════════

const CLR: Record<string, RGB> = {
  blue:   { r: 103, g: 215, b: 240 },
  green:  { r: 166, g: 224, b: 44  },
  pink:   { r: 250, g: 36,  b: 115 },
  orange: { r: 254, g: 149, b: 34  },
};
const rgba = (c: RGB, a = 1) => `rgba(${c.r},${c.g},${c.b},${a})`;

const GRAVITY    = 0.05;   // % per frame²
const CUBE_REL   = 0.06;   // cube size / min(w,h)
const HIT_REL    = 0.08;   // hit radius / min(w,h)
const FRAG_N     = 14;
const SPARK_N    = 10;
const TRAIL_LIFE = 18;     // frames
const TWO_PI     = Math.PI * 2;

// ─── 3-D maths ─────────────────────────────────────

const rotX = (v: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x, y: v.y * c - v.z * s, z: v.y * s + v.z * c };
};
const rotY = (v: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
};
const rotZ = (v: V3, a: number): V3 => {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c, z: v.z };
};

// ─── Cube model (unit cube ±0.5) ────────────────────

const VERTS: V3[] = [
  { x: -0.5, y: -0.5, z: -0.5 }, // 0
  { x:  0.5, y: -0.5, z: -0.5 }, // 1
  { x:  0.5, y:  0.5, z: -0.5 }, // 2
  { x: -0.5, y:  0.5, z: -0.5 }, // 3
  { x: -0.5, y: -0.5, z:  0.5 }, // 4
  { x:  0.5, y: -0.5, z:  0.5 }, // 5
  { x:  0.5, y:  0.5, z:  0.5 }, // 6
  { x: -0.5, y:  0.5, z:  0.5 }, // 7
];
const FACES: { v: number[]; n: V3 }[] = [
  { v: [4, 5, 6, 7], n: { x:  0, y:  0, z:  1 } }, // front
  { v: [1, 0, 3, 2], n: { x:  0, y:  0, z: -1 } }, // back
  { v: [7, 6, 2, 3], n: { x:  0, y:  1, z:  0 } }, // top
  { v: [0, 1, 5, 4], n: { x:  0, y: -1, z:  0 } }, // bottom
  { v: [0, 4, 7, 3], n: { x: -1, y:  0, z:  0 } }, // left
  { v: [5, 1, 2, 6], n: { x:  1, y:  0, z:  0 } }, // right
];

// ═══════════════════════════════════════════════════════
//  Engine
// ═══════════════════════════════════════════════════════

export default class FnEngine {
  /* viewport */
  private w = 0;
  private h = 0;
  private cubeSz = 40;
  private hitR   = 50;

  /* entity pools */
  private cubes:  Cube[]  = [];
  private frags:  Frag[]  = [];
  private sparks: Spark[] = [];
  private trail:  Trail[] = [];

  /* slow-mo */
  private speed       = 1;
  private targetSpeed = 1;

  // ─── Lifecycle ──────────────────────────────────

  resize(w: number, h: number) {
    this.w = w;
    this.h = h;
    const m = Math.min(w, h);
    this.cubeSz = m * CUBE_REL;
    this.hitR   = m * HIT_REL;
  }

  clear() {
    this.cubes  = [];
    this.frags  = [];
    this.sparks = [];
    this.trail  = [];
    this.speed  = 1;
    this.targetSpeed = 1;
  }

  // ─── Cube management ───────────────────────────

  addCube(sc: ServerCube) {
    this.cubes.push({
      id: sc.id,
      x: sc.x, y: sc.y,
      xD: sc.xD, yD: sc.yD,
      rX: Math.random() * TWO_PI,
      rY: Math.random() * TWO_PI,
      rZ: 0,
      rXd: (Math.random() - 0.5) * 0.12,
      rYd: (Math.random() - 0.5) * 0.12,
      rZd: (Math.random() - 0.5) * 0.04,
      color: CLR[sc.color] ?? CLR.blue,
      health: sc.health,
      maxHp: sc.health,
      wire: sc.wireframe,
      entered: false,
      flash: 0,
    });
  }

  /** Server confirmed a hit — visual feedback */
  hitCube(cubeId: number, destroyed: boolean, newHealth: number) {
    const i = this.cubes.findIndex(c => c.id === cubeId);
    if (i === -1) return;
    const c = this.cubes[i];
    this.burstSparks(c);
    if (destroyed) {
      this.burstFrags(c);
      this.cubes.splice(i, 1);
    } else {
      c.health = newHealth;
      c.flash = 12;
    }
  }

  /** Remove cube by id (miss or cleanup) */
  removeCube(id: number) {
    const i = this.cubes.findIndex(c => c.id === id);
    if (i !== -1) this.cubes.splice(i, 1);
  }

  /** Instant spark burst at screen coords (immediate swipe feedback) */
  sparkAt(px: number, py: number, color?: RGB) {
    const col = color ?? CLR.green;
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * TWO_PI;
      const sp = 2 + Math.random() * 4;
      this.sparks.push({
        x: px, y: py,
        xD: Math.cos(a) * sp, yD: Math.sin(a) * sp - 1,
        life: 14 + Math.random() * 8,
        color: col,
      });
    }
  }

  // ─── Slow-mo ────────────────────────────────────

  setSlowmo(active: boolean) {
    this.targetSpeed = active ? 0.15 : 1;
  }

  // ─── Hit testing ────────────────────────────────

  /** Returns cubeId + screen coords of nearest hit, or null */
  checkHit(px: number, py: number): HitResult | null {
    const hr2 = this.hitR * this.hitR;
    for (let i = this.cubes.length - 1; i >= 0; i--) {
      const c = this.cubes[i];
      const cx = c.x * this.w / 100;
      const cy = c.y * this.h / 100;
      if ((px - cx) ** 2 + (py - cy) ** 2 <= hr2) {
        return { cubeId: c.id, screenX: cx, screenY: cy };
      }
    }
    return null;
  }

  // ─── Pointer trail ──────────────────────────────

  pointerDown(px: number, py: number) {
    this.trail.push({ x: px, y: py, life: TRAIL_LIFE });
  }

  pointerMove(px: number, py: number) {
    this.trail.push({ x: px, y: py, life: TRAIL_LIFE });
    if (this.trail.length > 80) this.trail.splice(0, this.trail.length - 80);
  }

  // ─── Per-frame drain of missed cubes ────────────

  /** Cubes that flew off-screen after entering — caller sends fn_miss */
  drainMissed(): number[] {
    const out: number[] = [];
    for (let i = this.cubes.length - 1; i >= 0; i--) {
      if (this.cubes[i].entered && this.cubes[i].y > 115) {
        out.push(this.cubes[i].id);
        this.cubes.splice(i, 1);
      }
    }
    return out;
  }

  // ─── Update (dt in ms) ─────────────────────────

  update(dt: number) {
    const s = (dt / 16.667) * this.speed;
    this.speed += (this.targetSpeed - this.speed) * 0.07;

    /* cubes */
    for (const c of this.cubes) {
      c.x  += c.xD  * s;
      c.yD += GRAVITY * s;
      c.y  += c.yD  * s;
      c.rX += c.rXd * s;
      c.rY += c.rYd * s;
      c.rZ += c.rZd * s;
      if (c.flash > 0) c.flash -= s;
      if (c.y < 100) c.entered = true;
    }

    /* fragments */
    for (let i = this.frags.length - 1; i >= 0; i--) {
      const f = this.frags[i];
      f.x  += f.xD * s;
      f.yD += 0.35 * s;
      f.y  += f.yD * s;
      f.rot += f.rotD * s;
      f.life -= s;
      if (f.life <= 0) this.frags.splice(i, 1);
    }

    /* sparks */
    for (let i = this.sparks.length - 1; i >= 0; i--) {
      const sp = this.sparks[i];
      sp.x += sp.xD * s;
      sp.y += sp.yD * s;
      sp.xD *= 0.96;
      sp.yD *= 0.96;
      sp.yD += 0.12 * s;
      sp.life -= s;
      if (sp.life <= 0) this.sparks.splice(i, 1);
    }

    /* trail */
    for (let i = this.trail.length - 1; i >= 0; i--) {
      this.trail[i].life -= s;
      if (this.trail[i].life <= 0) this.trail.splice(i, 1);
    }
  }

  // ═══════════════════════════════════════════════════
  //  Render
  // ═══════════════════════════════════════════════════

  render(ctx: CanvasRenderingContext2D) {
    const { w, h } = this;
    if (!w || !h) return;

    /* ── background ── */
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#091a16');
    bg.addColorStop(1, '#0d2a1f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    /* subtle grid */
    ctx.strokeStyle = 'rgba(16,185,129,0.04)';
    ctx.lineWidth = 1;
    const g = 50;
    for (let x = 0; x < w; x += g) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); }
    for (let y = 0; y < h; y += g) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }

    /* trail */
    this._trail(ctx);

    /* cube shadows */
    for (const c of this.cubes) this._shadow(ctx, c);

    /* cubes (painter-sort by y) */
    const sorted = [...this.cubes].sort((a, b) => a.y - b.y);
    for (const c of sorted) this._cube(ctx, c);

    /* fragments */
    for (const f of this.frags) this._frag(ctx, f);

    /* sparks */
    for (const sp of this.sparks) this._spark(ctx, sp);

    /* slow-mo vignette */
    if (this.speed < 0.5) {
      const a = (1 - this.speed) * 0.25;
      const vig = ctx.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.75);
      vig.addColorStop(0, 'rgba(16,185,129,0)');
      vig.addColorStop(1, `rgba(6,78,59,${a})`);
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, w, h);

      ctx.fillStyle = `rgba(52,211,153,${a * 1.5})`;
      ctx.font = `bold ${Math.round(w * 0.035)}px Fredoka, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('S L O W - M O', w / 2, h * 0.11);
    }
  }

  // ─── Private render helpers ─────────────────────

  private _cube(ctx: CanvasRenderingContext2D, c: Cube) {
    const cx = c.x * this.w / 100;
    const cy = c.y * this.h / 100;
    const sz = this.cubeSz * (c.wire ? 1.2 : 1);
    const FL = 400;

    /* transform */
    const tv: V3[] = VERTS.map(v => {
      let p = rotX(v, c.rX);
      p = rotY(p, c.rY);
      p = rotZ(p, c.rZ);
      return { x: p.x * sz, y: p.y * sz, z: p.z * sz };
    });

    /* project (camera at +z via FL/(FL − z)) */
    const pv = tv.map(v => {
      const s = FL / (FL - v.z);
      return { x: cx + v.x * s, y: cy + v.y * s, z: v.z };
    });

    /* face depth sort (back → front) */
    const order = FACES.map((f, idx) => {
      const az = f.v.reduce((sum, vi) => sum + tv[vi].z, 0) / f.v.length;
      return { f, idx, az };
    }).sort((a, b) => a.az - b.az);

    for (const { f } of order) {
      /* rotate normal */
      let n = rotX(f.n, c.rX);
      n = rotY(n, c.rY);
      n = rotZ(n, c.rZ);

      /* backface cull — n.z > 0 means face points toward camera */
      if (!c.wire && n.z <= 0) continue;

      const pts = f.v.map(vi => pv[vi]);

      if (c.wire) {
        /* wireframe: stroke-only with glow */
        ctx.strokeStyle = rgba(c.color, 0.75);
        ctx.lineWidth = 2;
        ctx.shadowColor = rgba(c.color, 0.4);
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let j = 1; j < 4; j++) ctx.lineTo(pts[j].x, pts[j].y);
        ctx.closePath();
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        /* solid face with lighting */
        const light = 0.5 + n.y * 0.3 - n.z * 0.2;
        const sh = Math.max(0.2, Math.min(1, light));
        const r = Math.round(c.color.r * sh);
        const g = Math.round(c.color.g * sh);
        const b = Math.round(c.color.b * sh);

        ctx.fillStyle = c.flash > 0
          ? `rgba(255,255,255,${0.25 + 0.75 * Math.max(0, c.flash / 12)})`
          : `rgb(${r},${g},${b})`;
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let j = 1; j < 4; j++) ctx.lineTo(pts[j].x, pts[j].y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        /* glue strokes for strong (multi-hit) cubes */
        if (c.maxHp > 1 && c.health > 1) {
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(pts[2].x, pts[2].y);
          ctx.moveTo(pts[1].x, pts[1].y);
          ctx.lineTo(pts[3].x, pts[3].y);
          ctx.stroke();
        }
      }
    }

    /* health bar (strong cubes only) */
    if (c.maxHp > 1) {
      const bw = sz * 1.4;
      const bh = 4;
      const bx = cx - bw / 2;
      const by = cy - sz - 12;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = rgba(c.color);
      ctx.fillRect(bx, by, bw * (c.health / c.maxHp), bh);
    }
  }

  private _shadow(ctx: CanvasRenderingContext2D, c: Cube) {
    const cx = c.x * this.w / 100;
    const groundY = this.h * 0.93;
    const cy = c.y * this.h / 100;
    const dist = Math.abs(cy - groundY);
    const maxD = this.h * 0.55;
    if (dist > maxD) return;
    const scale = 1 - dist / maxD;
    const sr = this.cubeSz * scale * 1.3;
    ctx.fillStyle = `rgba(0,0,0,${0.12 * scale})`;
    ctx.beginPath();
    ctx.ellipse(cx, groundY, sr, sr * 0.25, 0, 0, TWO_PI);
    ctx.fill();
  }

  private _frag(ctx: CanvasRenderingContext2D, f: Frag) {
    const a = Math.max(0, f.life / 30);
    const s = f.size * a;
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate(f.rot);
    ctx.fillStyle = rgba(f.color, a);
    ctx.shadowColor = rgba(f.color, a * 0.4);
    ctx.shadowBlur = 6;
    ctx.fillRect(-s / 2, -s / 2, s, s);
    ctx.restore();
  }

  private _spark(ctx: CanvasRenderingContext2D, sp: Spark) {
    const a = Math.max(0, sp.life / 25);
    const r = 1.5 + a * 3;
    ctx.fillStyle = rgba(sp.color, a);
    ctx.shadowColor = rgba(sp.color, a * 0.7);
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, r, 0, TWO_PI);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private _trail(ctx: CanvasRenderingContext2D) {
    if (this.trail.length < 2) return;
    for (let i = 1; i < this.trail.length; i++) {
      const p = this.trail[i - 1];
      const c = this.trail[i];
      const a = c.life / TRAIL_LIFE;
      ctx.strokeStyle = `rgba(52,211,153,${a * 0.65})`;
      ctx.lineWidth = a * 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(16,185,129,${a * 0.4})`;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(c.x, c.y);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // ─── Burst helpers ──────────────────────────────

  private burstFrags(c: Cube) {
    const cx = c.x * this.w / 100;
    const cy = c.y * this.h / 100;
    const cxD = c.xD * this.w / 100 * 0.3;
    const cyD = c.yD * this.h / 100 * 0.3;
    for (let i = 0; i < FRAG_N; i++) {
      const a  = (TWO_PI * i) / FRAG_N + Math.random() * 0.5;
      const sp = 3 + Math.random() * 5;
      this.frags.push({
        x: cx + (Math.random() - 0.5) * this.cubeSz,
        y: cy + (Math.random() - 0.5) * this.cubeSz,
        xD: Math.cos(a) * sp + cxD,
        yD: Math.sin(a) * sp - 2 + cyD,
        rot: Math.random() * TWO_PI,
        rotD: (Math.random() - 0.5) * 0.3,
        size: this.cubeSz * (0.12 + Math.random() * 0.18),
        life: 22 + Math.random() * 12,
        color: c.color,
      });
    }
  }

  private burstSparks(c: Cube) {
    const cx = c.x * this.w / 100;
    const cy = c.y * this.h / 100;
    for (let i = 0; i < SPARK_N; i++) {
      const a  = Math.random() * TWO_PI;
      const sp = 2 + Math.random() * 4;
      this.sparks.push({
        x: cx, y: cy,
        xD: Math.cos(a) * sp,
        yD: Math.sin(a) * sp - 1.5,
        life: 18 + Math.random() * 10,
        color: c.color,
      });
    }
  }
}
