/* ============================================================
   Motor de xadrez: regras completas (0x88), SAN, busca alfa-beta
   ============================================================ */
(function (root) {
  'use strict';

  const P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  const FILES = 'abcdefgh';
  const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const sqName = s => FILES[s & 7] + (8 - (s >> 4));
  const nameSq = n => (8 - parseInt(n[1], 10)) * 16 + FILES.indexOf(n[0]);
  const LETTER = { 1: 'P', 2: 'N', 3: 'B', 4: 'R', 5: 'Q', 6: 'K' };
  const FROMCH = { p: 1, n: 2, b: 3, r: 4, q: 5, k: 6 };

  const DN = [-33, -31, -18, -14, 14, 18, 31, 33];
  const DK = [-17, -16, -15, -1, 1, 15, 16, 17];
  const DB = [-17, -15, 15, 17];
  const DR = [-16, -1, 1, 16];

  // ---------- Zobrist ----------
  let seed = 0x1234abcd;
  function rnd() {
    seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return (t ^ (t >>> 14)) | 0;
  }
  const ZP = [];
  for (let p = 0; p < 16; p++) { ZP[p] = new Int32Array(128); for (let s = 0; s < 128; s++) ZP[p][s] = rnd(); }
  const ZT = rnd();
  const ZC = new Int32Array(16); for (let i = 0; i < 16; i++) ZC[i] = rnd();
  const ZE = new Int32Array(128); for (let i = 0; i < 128; i++) ZE[i] = rnd();

  // direitos de roque a remover quando uma casa é tocada
  const CR = new Int8Array(128).fill(15);
  CR[116] = 15 & ~3; CR[119] = 15 & ~1; CR[112] = 15 & ~2;
  CR[4] = 15 & ~12; CR[7] = 15 & ~4; CR[0] = 15 & ~8;

  const mFrom = m => m & 127;
  const mTo = m => (m >> 7) & 127;
  const mPromo = m => (m >> 14) & 7;
  const mFlag = m => (m >> 17) & 7; // 1 duplo, 2 en passant, 3 roque curto, 4 roque longo

  // ================== POSIÇÃO ==================
  class Position {
    constructor(fen) {
      this.b = new Int8Array(128);
      this.kp = [116, 4];
      this.sM = new Int32Array(2048); this.sCap = new Int8Array(2048);
      this.sCastle = new Int8Array(2048); this.sEp = new Int16Array(2048);
      this.sHalf = new Int16Array(2048); this.sHash = new Int32Array(2048);
      this.ply = 0;
      this.setFen(fen || START);
    }
    setFen(fen) {
      const f = fen.trim().split(/\s+/);
      this.b.fill(0);
      const rows = f[0].split('/');
      for (let r = 0; r < 8; r++) {
        let c = 0;
        for (const ch of rows[r]) {
          if (ch >= '1' && ch <= '8') c += +ch;
          else {
            const lower = ch.toLowerCase();
            const p = FROMCH[lower] | (ch === lower ? 8 : 0);
            this.b[r * 16 + c] = p;
            if (FROMCH[lower] === K) this.kp[ch === lower ? 1 : 0] = r * 16 + c;
            c++;
          }
        }
      }
      this.turn = f[1] === 'b' ? 1 : 0;
      this.castling = 0;
      const cs = f[2] || '-';
      if (cs.includes('K')) this.castling |= 1;
      if (cs.includes('Q')) this.castling |= 2;
      if (cs.includes('k')) this.castling |= 4;
      if (cs.includes('q')) this.castling |= 8;
      this.ep = (f[3] && f[3] !== '-') ? nameSq(f[3]) : -1;
      this.half = parseInt(f[4] || '0', 10) || 0;
      this.full = parseInt(f[5] || '1', 10) || 1;
      this.ply = 0;
      this.hash = this.computeHash();
    }
    computeHash() {
      let h = 0;
      for (let s = 0; s < 128; s++) { if (s & 0x88) { s += 7; continue; } if (this.b[s]) h ^= ZP[this.b[s]][s]; }
      if (this.turn) h ^= ZT;
      h ^= ZC[this.castling];
      if (this.ep >= 0) h ^= ZE[this.ep];
      return h;
    }
    fen() {
      let s = '';
      for (let r = 0; r < 8; r++) {
        let e = 0;
        for (let c = 0; c < 8; c++) {
          const p = this.b[r * 16 + c];
          if (!p) { e++; continue; }
          if (e) { s += e; e = 0; }
          const ch = LETTER[p & 7];
          s += (p >> 3) ? ch.toLowerCase() : ch;
        }
        if (e) s += e;
        if (r < 7) s += '/';
      }
      let cs = '';
      if (this.castling & 1) cs += 'K'; if (this.castling & 2) cs += 'Q';
      if (this.castling & 4) cs += 'k'; if (this.castling & 8) cs += 'q';
      return `${s} ${this.turn ? 'b' : 'w'} ${cs || '-'} ${this.ep >= 0 ? sqName(this.ep) : '-'} ${this.half} ${this.full}`;
    }

    attacked(sq, by) {
      const b = this.b;
      const pawn = P | (by << 3);
      if (by === 0) {
        let t = sq + 15; if (!(t & 0x88) && b[t] === pawn) return true;
        t = sq + 17; if (!(t & 0x88) && b[t] === pawn) return true;
      } else {
        let t = sq - 15; if (!(t & 0x88) && b[t] === pawn) return true;
        t = sq - 17; if (!(t & 0x88) && b[t] === pawn) return true;
      }
      const kn = N | (by << 3), kg = K | (by << 3);
      for (let i = 0; i < 8; i++) { const t = sq + DN[i]; if (!(t & 0x88) && b[t] === kn) return true; }
      for (let i = 0; i < 8; i++) { const t = sq + DK[i]; if (!(t & 0x88) && b[t] === kg) return true; }
      const bi = B | (by << 3), ro = R | (by << 3), qu = Q | (by << 3);
      for (let i = 0; i < 4; i++) {
        const o = DB[i]; let t = sq + o;
        while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === bi || p === qu) return true; break; } t += o; }
      }
      for (let i = 0; i < 4; i++) {
        const o = DR[i]; let t = sq + o;
        while (!(t & 0x88)) { const p = b[t]; if (p) { if (p === ro || p === qu) return true; break; } t += o; }
      }
      return false;
    }
    inCheck() { return this.attacked(this.kp[this.turn], this.turn ^ 1); }
    // depois de make(): o lado que acabou de mover deixou o rei em xeque?
    illegal() { const us = this.turn ^ 1; return this.attacked(this.kp[us], this.turn); }

    genMoves(capsOnly) {
      const b = this.b, us = this.turn, them = us ^ 1, moves = [];
      for (let sq = 0; sq < 128; sq++) {
        if (sq & 0x88) { sq += 7; continue; }
        const p = b[sq];
        if (!p || (p >> 3) !== us) continue;
        const t = p & 7;
        if (t === P) {
          const dir = us === 0 ? -16 : 16;
          const startRow = us === 0 ? 6 : 1, promoRow = us === 0 ? 0 : 7;
          const to = sq + dir;
          const promoPush = (to >> 4) === promoRow;
          if ((!capsOnly || promoPush) && !b[to]) {
            if (promoPush) { for (let pr = 5; pr >= 2; pr--) moves.push(sq | (to << 7) | (pr << 14)); }
            else {
              moves.push(sq | (to << 7));
              if ((sq >> 4) === startRow && !b[to + dir]) moves.push(sq | ((to + dir) << 7) | (1 << 17));
            }
          }
          for (let k = -1; k <= 1; k += 2) {
            const tt = sq + dir + k;
            if (tt & 0x88) continue;
            const tp = b[tt];
            if (tp && (tp >> 3) === them) {
              if ((tt >> 4) === promoRow) { for (let pr = 5; pr >= 2; pr--) moves.push(sq | (tt << 7) | (pr << 14)); }
              else moves.push(sq | (tt << 7));
            } else if (!tp && tt === this.ep) moves.push(sq | (tt << 7) | (2 << 17));
          }
        } else if (t === N || t === K) {
          const offs = t === N ? DN : DK;
          for (let i = 0; i < 8; i++) {
            const to = sq + offs[i];
            if (to & 0x88) continue;
            const tp = b[to];
            if (!tp) { if (!capsOnly) moves.push(sq | (to << 7)); }
            else if ((tp >> 3) !== us) moves.push(sq | (to << 7));
          }
        } else {
          const offs = t === B ? DB : t === R ? DR : DK;
          const n = offs.length;
          for (let i = 0; i < n; i++) {
            const o = offs[i]; let to = sq + o;
            while (!(to & 0x88)) {
              const tp = b[to];
              if (!tp) { if (!capsOnly) moves.push(sq | (to << 7)); }
              else { if ((tp >> 3) !== us) moves.push(sq | (to << 7)); break; }
              to += o;
            }
          }
        }
      }
      if (!capsOnly) {
        const ks = us === 0 ? 116 : 4;
        if (b[ks] === (K | (us << 3)) && this.castling & (us === 0 ? 3 : 12)) {
          const kBit = us === 0 ? 1 : 4, qBit = us === 0 ? 2 : 8, rk = R | (us << 3);
          if ((this.castling & kBit) && !b[ks + 1] && !b[ks + 2] && b[ks + 3] === rk &&
            !this.attacked(ks, them) && !this.attacked(ks + 1, them) && !this.attacked(ks + 2, them))
            moves.push(ks | ((ks + 2) << 7) | (3 << 17));
          if ((this.castling & qBit) && !b[ks - 1] && !b[ks - 2] && !b[ks - 3] && b[ks - 4] === rk &&
            !this.attacked(ks, them) && !this.attacked(ks - 1, them) && !this.attacked(ks - 2, them))
            moves.push(ks | ((ks - 2) << 7) | (4 << 17));
        }
      }
      return moves;
    }

    make(m) {
      const b = this.b, us = this.turn;
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 7;
      const p = b[from];
      const i = this.ply++;
      this.sM[i] = m; this.sCastle[i] = this.castling; this.sEp[i] = this.ep; this.sHalf[i] = this.half; this.sHash[i] = this.hash;
      let h = this.hash ^ ZC[this.castling];
      if (this.ep >= 0) h ^= ZE[this.ep];
      this.ep = -1;
      let cap = b[to];
      b[from] = 0; h ^= ZP[p][from];
      if (flag === 2) { const cs = to + (us === 0 ? 16 : -16); cap = b[cs]; b[cs] = 0; h ^= ZP[cap][cs]; }
      else if (cap) h ^= ZP[cap][to];
      this.sCap[i] = cap;
      const np = promo ? (promo | (us << 3)) : p;
      b[to] = np; h ^= ZP[np][to];
      if (flag === 3) { const r = b[to + 1]; b[to + 1] = 0; b[to - 1] = r; h ^= ZP[r][to + 1] ^ ZP[r][to - 1]; }
      else if (flag === 4) { const r = b[to - 2]; b[to - 2] = 0; b[to + 1] = r; h ^= ZP[r][to - 2] ^ ZP[r][to + 1]; }
      else if (flag === 1) { this.ep = (from + to) >> 1; h ^= ZE[this.ep]; }
      if ((p & 7) === K) this.kp[us] = to;
      this.castling &= CR[from] & CR[to];
      h ^= ZC[this.castling] ^ ZT;
      this.half = ((p & 7) === P || cap) ? 0 : this.half + 1;
      if (us === 1) this.full++;
      this.turn = us ^ 1; this.hash = h;
    }
    unmake() {
      const i = --this.ply, m = this.sM[i], b = this.b;
      const us = this.turn ^ 1; this.turn = us;
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 7;
      let p = b[to];
      if (promo) p = P | (us << 3);
      b[from] = p;
      const cap = this.sCap[i];
      if (flag === 2) { b[to] = 0; b[to + (us === 0 ? 16 : -16)] = cap; } else b[to] = cap;
      if (flag === 3) { b[to + 1] = b[to - 1]; b[to - 1] = 0; }
      else if (flag === 4) { b[to - 2] = b[to + 1]; b[to + 1] = 0; }
      if ((p & 7) === K) this.kp[us] = from;
      this.castling = this.sCastle[i]; this.ep = this.sEp[i]; this.half = this.sHalf[i]; this.hash = this.sHash[i];
      if (us === 1) this.full--;
    }
    legalMoves() {
      const ps = this.genMoves(false), out = [];
      for (let i = 0; i < ps.length; i++) {
        this.make(ps[i]);
        if (!this.illegal()) out.push(ps[i]);
        this.unmake();
      }
      return out;
    }
    isRepetition() {
      const lim = Math.max(0, this.ply - this.half);
      for (let j = this.ply - 2; j >= lim; j -= 2) if (this.sHash[j] === this.hash) return true;
      return false;
    }
    repetitions() {
      let n = 1;
      const lim = Math.max(0, this.ply - this.half);
      for (let j = this.ply - 2; j >= lim; j -= 2) if (this.sHash[j] === this.hash) n++;
      return n;
    }
    perft(d) {
      if (d === 0) return 1;
      const ms = this.genMoves(false); let n = 0;
      for (let i = 0; i < ms.length; i++) {
        this.make(ms[i]);
        if (!this.illegal()) n += d === 1 ? 1 : this.perft(d - 1);
        this.unmake();
      }
      return n;
    }
    insufficient() {
      const minors = []; let bishops = [];
      for (let s = 0; s < 128; s++) {
        if (s & 0x88) { s += 7; continue; }
        const p = this.b[s]; if (!p) continue;
        const t = p & 7;
        if (t === P || t === R || t === Q) return false;
        if (t === N || t === B) { minors.push(p); if (t === B) bishops.push((((s >> 4) + (s & 7)) & 1)); }
      }
      if (minors.length <= 1) return true;
      if (minors.length === 2 && bishops.length === 2 && bishops[0] === bishops[1] &&
        (minors[0] >> 3) !== (minors[1] >> 3)) return true;
      return false;
    }
  }

  // ================== AVALIAÇÃO ==================
  const PV = [0, 100, 320, 330, 500, 900, 0];
  const PST = {
    1: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    2: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    3: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    4: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    5: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    6: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20]
  };
  const KEG = [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50];
  const PASSED = [0, 0, 10, 20, 40, 70, 110, 0]; // por fileira avançada

  function evaluate(pos) {
    const b = pos.b;
    let sc = 0, phase = 0;
    let wk = 0, bk = 0, wke = 0, bke = 0;
    const wp = [], bp = []; // [row, col]
    const wpf = new Int8Array(8), bpf = new Int8Array(8);
    let wb = 0, bb = 0;
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq]; if (!p) continue;
      const t = p & 7, col = p >> 3, r = sq >> 4, c = sq & 7;
      const idx = col === 0 ? r * 8 + c : (7 - r) * 8 + c;
      if (t === K) {
        if (col === 0) { wk = PST[6][idx]; wke = KEG[idx]; } else { bk = PST[6][idx]; bke = KEG[idx]; }
        continue;
      }
      const v = PV[t] + PST[t][idx];
      if (col === 0) sc += v; else sc -= v;
      if (t === N || t === B) phase += 1; else if (t === R) phase += 2; else if (t === Q) phase += 4;
      if (t === B) { if (col === 0) wb++; else bb++; }
      if (t === P) { if (col === 0) { wp.push(r, c); wpf[c]++; } else { bp.push(r, c); bpf[c]++; } }
    }
    if (phase > 24) phase = 24;
    if (wb >= 2) sc += 30; if (bb >= 2) sc -= 30;
    // estrutura de peões
    for (let i = 0; i < wp.length; i += 2) {
      const r = wp[i], c = wp[i + 1];
      if (wpf[c] > 1) sc -= 10;
      if ((c === 0 || !wpf[c - 1]) && (c === 7 || !wpf[c + 1])) sc -= 12;
      let passed = true;
      for (let rr = 0; rr < r && passed; rr++) for (let cc = Math.max(0, c - 1); cc <= Math.min(7, c + 1); cc++) if (b[rr * 16 + cc] === 9) { passed = false; break; }
      if (passed) sc += PASSED[7 - r] * (1 + (24 - phase) / 48);
    }
    for (let i = 0; i < bp.length; i += 2) {
      const r = bp[i], c = bp[i + 1];
      if (bpf[c] > 1) sc += 10;
      if ((c === 0 || !bpf[c - 1]) && (c === 7 || !bpf[c + 1])) sc += 12;
      let passed = true;
      for (let rr = r + 1; rr < 8 && passed; rr++) for (let cc = Math.max(0, c - 1); cc <= Math.min(7, c + 1); cc++) if (b[rr * 16 + cc] === 1) { passed = false; break; }
      if (passed) sc -= PASSED[r] * (1 + (24 - phase) / 48);
    }
    // escudo do rei (só no meio-jogo)
    const shield = (ksq, col) => {
      const dir = col === 0 ? -16 : 16, pawn = col === 0 ? 1 : 9; let n = 0;
      for (let k = -1; k <= 1; k++) {
        const t = ksq + dir + k; if (!(t & 0x88) && b[t] === pawn) n += 2;
        const t2 = ksq + dir * 2 + k; if (!(t2 & 0x88) && b[t2] === pawn) n += 1;
      }
      return n * 6;
    };
    const kmg = (wk - bk) + shield(pos.kp[0], 0) - shield(pos.kp[1], 1);
    const keg = (wke - bke);
    sc += (kmg * phase + keg * (24 - phase)) / 24;
    return pos.turn === 0 ? sc : -sc;
  }

  // ================== BUSCA ==================
  const MATE = 30000, INF = 32000;
  const TTSIZE = 1 << 18, TTMASK = TTSIZE - 1;
  const ttKey = new Int32Array(TTSIZE), ttMove = new Int32Array(TTSIZE), ttScore = new Int32Array(TTSIZE);
  const ttDepth = new Int8Array(TTSIZE), ttFlag = new Int8Array(TTSIZE);

  class Search {
    constructor(pos) {
      this.pos = pos;
      this.killers = []; for (let i = 0; i < 128; i++) this.killers.push([0, 0]);
      this.hist = new Int32Array(128 * 128);
    }
    scoreMoves(moves, ttm, ply) {
      const b = this.pos.b, sc = new Array(moves.length), k = this.killers[ply];
      for (let i = 0; i < moves.length; i++) {
        const m = moves[i];
        if (m === ttm) { sc[i] = 1e7; continue; }
        const from = m & 127, to = (m >> 7) & 127, flag = (m >> 17) & 7, promo = (m >> 14) & 7;
        const victim = flag === 2 ? P : (b[to] & 7);
        if (victim) sc[i] = 1e6 + PV[victim] * 10 - (b[from] & 7);
        else if (promo) sc[i] = 9e5 + promo;
        else if (m === k[0]) sc[i] = 8e5;
        else if (m === k[1]) sc[i] = 7e5;
        else sc[i] = this.hist[from * 128 + to];
      }
      return sc;
    }
    quiesce(alpha, beta, ply) {
      const pos = this.pos;
      if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
      if (this.stop) return 0;
      const stand = evaluate(pos);
      if (ply >= 60) return stand;
      if (stand >= beta) return stand;
      if (stand > alpha) alpha = stand;
      const moves = pos.genMoves(true);
      const sc = this.scoreMoves(moves, 0, ply);
      for (let i = 0; i < moves.length; i++) {
        let bi = i;
        for (let j = i + 1; j < moves.length; j++) if (sc[j] > sc[bi]) bi = j;
        if (bi !== i) { let t = moves[i]; moves[i] = moves[bi]; moves[bi] = t; t = sc[i]; sc[i] = sc[bi]; sc[bi] = t; }
        const m = moves[i];
        const to = (m >> 7) & 127, promo = (m >> 14) & 7;
        const victim = ((m >> 17) & 7) === 2 ? P : (pos.b[to] & 7);
        if (!promo && stand + PV[victim] + 200 < alpha) continue;
        pos.make(m);
        if (pos.illegal()) { pos.unmake(); continue; }
        const s = -this.quiesce(-beta, -alpha, ply + 1);
        pos.unmake();
        if (this.stop) return 0;
        if (s >= beta) return s;
        if (s > alpha) alpha = s;
      }
      return alpha;
    }
    negamax(depth, alpha, beta, ply) {
      const pos = this.pos;
      if ((++this.nodes & 2047) === 0 && Date.now() > this.deadline) this.stop = true;
      if (this.stop) return 0;
      if (ply > 0 && (pos.half >= 100 || pos.isRepetition())) return 0;
      const inChk = pos.inCheck();
      if (inChk) depth++;
      if (depth <= 0) return this.quiesce(alpha, beta, ply);
      if (ply >= 100) return evaluate(pos);
      const h = pos.hash, idx = (h >>> 0) & TTMASK;
      let ttm = 0;
      if (ttKey[idx] === h && ttFlag[idx] !== 0) {
        ttm = ttMove[idx];
        if (ttDepth[idx] >= depth && ply > 0) {
          let s = ttScore[idx];
          if (s > MATE - 200) s -= ply; else if (s < -MATE + 200) s += ply;
          const f = ttFlag[idx];
          if (f === 1) return s;
          if (f === 2 && s >= beta) return s;
          if (f === 3 && s <= alpha) return s;
        }
      }
      const moves = pos.genMoves(false);
      const sc = this.scoreMoves(moves, ttm, ply);
      let best = -INF, bestMove = 0, legal = 0;
      const origAlpha = alpha;
      for (let i = 0; i < moves.length; i++) {
        let bi = i;
        for (let j = i + 1; j < moves.length; j++) if (sc[j] > sc[bi]) bi = j;
        if (bi !== i) { let t = moves[i]; moves[i] = moves[bi]; moves[bi] = t; t = sc[i]; sc[i] = sc[bi]; sc[bi] = t; }
        const m = moves[i];
        const to = (m >> 7) & 127;
        const quiet = !pos.b[to] && !((m >> 14) & 7) && ((m >> 17) & 7) !== 2;
        pos.make(m);
        if (pos.illegal()) { pos.unmake(); continue; }
        legal++;
        let s;
        if (legal === 1) s = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
        else {
          let red = 0;
          if (depth >= 3 && legal > 4 && quiet && !inChk) red = 1 + (legal > 10 ? 1 : 0);
          s = -this.negamax(depth - 1 - red, -alpha - 1, -alpha, ply + 1);
          if (s > alpha && (red > 0 || s < beta)) s = -this.negamax(depth - 1, -beta, -alpha, ply + 1);
        }
        pos.unmake();
        if (this.stop) return 0;
        if (s > best) { best = s; bestMove = m; }
        if (s > alpha) {
          alpha = s;
          if (alpha >= beta) {
            if (quiet) {
              const k = this.killers[ply];
              if (k[0] !== m) { k[1] = k[0]; k[0] = m; }
              const hi = (m & 127) * 128 + to;
              this.hist[hi] = Math.min(6000, this.hist[hi] + depth * depth);
            }
            break;
          }
        }
      }
      if (legal === 0) return inChk ? -MATE + ply : 0;
      let st = best;
      if (st > MATE - 200) st += ply; else if (st < -MATE + 200) st -= ply;
      ttKey[idx] = h; ttMove[idx] = bestMove; ttScore[idx] = st; ttDepth[idx] = depth;
      ttFlag[idx] = best <= origAlpha ? 3 : (best >= beta ? 2 : 1);
      return best;
    }
    /** opts: {depth, time, noise} -> {move, score, depth, nodes} */
    run(opts) {
      const pos = this.pos;
      this.deadline = Date.now() + (opts.time || 1000);
      this.stop = false; this.nodes = 0;
      ttFlag.fill(0); this.hist.fill(0);
      for (const k of this.killers) { k[0] = 0; k[1] = 0; }
      let root = pos.legalMoves();
      if (!root.length) return null;
      if (root.length === 1) return { move: root[0], score: 0, depth: 0, nodes: 0 };
      const noise = opts.noise || 0;
      if (noise > 0) {
        let bestM = root[0], bestS = -Infinity;
        for (const m of root) {
          pos.make(m);
          let s = -this.negamax(Math.max(0, (opts.depth || 1) - 1), -INF, INF, 1);
          pos.unmake();
          s += (Math.random() * 2 - 1) * noise;
          if (s > bestS) { bestS = s; bestM = m; }
        }
        return { move: bestM, score: bestS, depth: opts.depth, nodes: this.nodes };
      }
      let bestMove = root[0], bestScore = 0, doneDepth = 0;
      for (let d = 1; d <= (opts.depth || 4); d++) {
        let alpha = -INF, localBest = 0, localScore = -INF;
        const sc = this.scoreMoves(root, bestMove, 0);
        const order = root.map((m, i) => [sc[i], m]).sort((a, b) => b[0] - a[0]).map(x => x[1]);
        root = order;
        for (let i = 0; i < root.length; i++) {
          const m = root[i];
          pos.make(m);
          let s;
          if (i === 0) s = -this.negamax(d - 1, -INF, -alpha, 1);
          else {
            s = -this.negamax(d - 1, -alpha - 1, -alpha, 1);
            if (s > alpha) s = -this.negamax(d - 1, -INF, -alpha, 1);
          }
          pos.unmake();
          if (this.stop) break;
          if (s > localScore) { localScore = s; localBest = m; }
          if (s > alpha) alpha = s;
        }
        if (this.stop) {
          // aproveita resultado parcial só se já achou melhor que o anterior
          if (localBest && localScore > bestScore + 50) { bestMove = localBest; bestScore = localScore; }
          break;
        }
        bestMove = localBest; bestScore = localScore; doneDepth = d;
        if (Math.abs(bestScore) > MATE - 100) break;
        if (Date.now() > this.deadline) break;
      }
      return { move: bestMove, score: bestScore, depth: doneDepth, nodes: this.nodes };
    }
  }

  // ================== JOGO (histórico, SAN, estado) ==================
  class Game {
    constructor(fen) {
      this.startFen = fen || START;
      this.pos = new Position(this.startFen);
      this.history = []; // {m, san, from, to, piece, cap}
    }
    legal() { return this.pos.legalMoves(); }
    san(m, legal) {
      const pos = this.pos, b = pos.b;
      const from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 7;
      const p = b[from], t = p & 7;
      let s;
      if (flag === 3) s = 'O-O';
      else if (flag === 4) s = 'O-O-O';
      else {
        const isCap = !!b[to] || flag === 2;
        if (t === P) {
          s = isCap ? FILES[from & 7] + 'x' : '';
          s += sqName(to);
          if (promo) s += '=' + LETTER[promo];
        } else {
          s = LETTER[t];
          legal = legal || pos.legalMoves();
          let sameFile = false, sameRank = false, amb = false;
          for (const o of legal) {
            const of = o & 127;
            if (o === m || ((o >> 7) & 127) !== to || of === from) continue;
            if ((b[of] & 7) !== t) continue;
            amb = true;
            if ((of & 7) === (from & 7)) sameFile = true;
            if ((of >> 4) === (from >> 4)) sameRank = true;
          }
          if (amb) {
            if (!sameFile) s += FILES[from & 7];
            else if (!sameRank) s += (8 - (from >> 4));
            else s += sqName(from);
          }
          if (isCap) s += 'x';
          s += sqName(to);
        }
      }
      pos.make(m);
      if (pos.inCheck()) {
        const any = pos.legalMoves().length > 0;
        s += any ? '+' : '#';
      }
      pos.unmake();
      return s;
    }
    play(m) {
      const pos = this.pos, legal = pos.legalMoves();
      if (legal.indexOf(m) < 0) return false;
      const san = this.san(m, legal);
      const from = m & 127, to = (m >> 7) & 127;
      const cap = ((m >> 17) & 7) === 2 ? (pos.turn === 0 ? 9 : 1) : pos.b[to];
      this.history.push({ m, san, from, to, piece: pos.b[from], cap, color: pos.turn });
      pos.make(m);
      return true;
    }
    undo() {
      if (!this.history.length) return null;
      this.pos.unmake();
      return this.history.pop();
    }
    findMove(from, to, promo) {
      for (const m of this.pos.legalMoves()) {
        if ((m & 127) === from && ((m >> 7) & 127) === to) {
          const pr = (m >> 14) & 7;
          if (!promo || pr === promo) return m;
        }
      }
      return 0;
    }
    parseSAN(str) {
      const norm = x => x.replace(/[+#!?]/g, '').replace(/0/g, 'O').replace('e.p.', '');
      const want = norm(str);
      const legal = this.pos.legalMoves();
      for (const m of legal) if (norm(this.san(m, legal)) === want) return m;
      return 0;
    }
    status() {
      const pos = this.pos, legal = pos.legalMoves();
      if (!legal.length) {
        if (pos.inCheck()) return { over: true, kind: 'mate', winner: pos.turn ^ 1 };
        return { over: true, kind: 'stalemate', winner: -1 };
      }
      if (pos.insufficient()) return { over: true, kind: 'material', winner: -1 };
      if (pos.half >= 100) return { over: true, kind: 'fifty', winner: -1 };
      if (pos.repetitions() >= 3) return { over: true, kind: 'repetition', winner: -1 };
      return { over: false, check: pos.inCheck() };
    }
    fen() { return this.pos.fen(); }
  }

  const LEVELS = [
    { name: 'Iniciante', elo: 500, depth: 1, time: 60, noise: 450, blunder: 0.30, book: 0 },
    { name: 'Fácil', elo: 800, depth: 1, time: 80, noise: 220, blunder: 0.12, book: 0.3 },
    { name: 'Casual', elo: 1050, depth: 2, time: 150, noise: 100, blunder: 0.04, book: 0.6 },
    { name: 'Intermediário', elo: 1350, depth: 3, time: 450, noise: 40, book: 0.85 },
    { name: 'Avançado', elo: 1650, depth: 4, time: 1000, noise: 12, book: 1 },
    { name: 'Expert', elo: 1950, depth: 6, time: 2000, noise: 0, book: 1 },
    { name: 'Mestre', elo: 2200, depth: 9, time: 4000, noise: 0, book: 1 },
    { name: 'Máximo', elo: 2400, depth: 14, time: 8000, noise: 0, book: 1 }
  ];

  /** escolhe o lance da IA (sem livro de aberturas; a UI cuida do livro) */
  function pickMove(game, levelIdx, overrideTime) {
    const lv = LEVELS[Math.max(0, Math.min(LEVELS.length - 1, levelIdx))];
    const legal = game.pos.legalMoves();
    if (!legal.length) return null;
    if (lv.blunder && Math.random() < lv.blunder) return legal[Math.floor(Math.random() * legal.length)];
    const s = new Search(game.pos);
    const r = s.run({ depth: lv.depth, time: overrideTime || lv.time, noise: lv.noise });
    return r ? r.move : legal[0];
  }

  const api = { Position, Game, Search, evaluate, pickMove, LEVELS, START, sqName, nameSq, mFrom, mTo, mPromo, mFlag, LETTER, PV, FILES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ChessEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);
