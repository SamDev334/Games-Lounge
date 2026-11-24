/* ============================================================
   Treinador de xadrez: compara o lance do jogador com o melhor do
   motor e explica, em português, o que foi bom/ruim e o que seria melhor.
   · analyzeCore(E, dados)  roda as buscas (no worker ou na página)
   · review(E, dados, res)  transforma o resultado em explicação
   Funciona no navegador, no Web Worker e no Node (testes).
   ============================================================ */
(function (root) {
  'use strict';

  const NAME = ['', 'peão', 'cavalo', 'bispo', 'torre', 'dama', 'rei'];
  const GEN = ['', 'o peão', 'o cavalo', 'o bispo', 'a torre', 'a dama', 'o rei'];       // com artigo
  const VAL = [0, 1, 3, 3, 5, 9, 0];
  const MATE = 29000;
  const KN = [-33, -31, -18, -14, 14, 18, 31, 33], DIAG = [-17, -15, 15, 17], ORTH = [-16, -1, 1, 16];

  // ---------- busca (executada no worker ou, se faltar, na página) ----------
  /** d: {fen, moves[], played, depth, time} -> {best, bestScore, playedScore, reply, depth} */
  function analyzeCore(E, d) {
    const g = new E.Game(d.fen);
    for (const m of d.moves) g.pos.make(m);
    const s1 = new E.Search(g.pos);
    const r1 = s1.run({ depth: d.depth, time: d.time, noise: 0 });
    if (!r1) return null;
    let playedScore, reply = 0;
    if (r1.move === d.played) playedScore = r1.score;
    else {
      g.pos.make(d.played);
      const r2 = new E.Search(g.pos).run({ depth: Math.max(1, d.depth - 1), time: d.time, noise: 0 });
      if (!r2) playedScore = g.pos.inCheck() ? 30000 : 0;                       // mate dado ou afogamento
      else { playedScore = -r2.score; reply = r2.move; }
    }
    return { best: r1.move, bestScore: r1.score, playedScore, reply, depth: r1.depth };
  }

  // ---------- tática: quem ataca/defende uma casa ----------
  function attackers(b, sq, by) {
    const out = [], pc = by << 3;
    for (const d of (by === 0 ? [15, 17] : [-15, -17])) { const s = sq + d; if (!(s & 0x88) && b[s] === (1 | pc)) out.push(1); }
    for (const d of KN) { const s = sq + d; if (!(s & 0x88) && b[s] === (2 | pc)) out.push(2); }
    for (const d of DIAG) { let s = sq + d; while (!(s & 0x88)) { const p = b[s]; if (p) { if (p >> 3 === by) { const t = p & 7; if (t === 3 || t === 5 || (t === 6 && s === sq + d)) out.push(t); } break; } s += d; } }
    for (const d of ORTH) { let s = sq + d; while (!(s & 0x88)) { const p = b[s]; if (p) { if (p >> 3 === by) { const t = p & 7; if (t === 4 || t === 5 || (t === 6 && s === sq + d)) out.push(t); } break; } s += d; } }
    return out;
  }
  /** peças de `color` que podem ser capturadas com vantagem (sem defesa, ou por peça de menor valor) */
  function hanging(pos, color) {
    const b = pos.b, res = [];
    for (let sq = 0; sq < 128; sq++) {
      if (sq & 0x88) { sq += 7; continue; }
      const p = b[sq]; if (!p || p >> 3 !== color) continue;
      const t = p & 7; if (t === 6) continue;
      const atk = attackers(b, sq, color ^ 1); if (!atk.length) continue;
      const lowest = Math.min(...atk.map(x => VAL[x] || 99)), def = attackers(b, sq, color).length;
      if (def === 0 || lowest < VAL[t]) res.push({ sq, t, by: atk.slice().sort((x, y) => (VAL[x] || 99) - (VAL[y] || 99))[0], defended: def > 0 });
    }
    return res;
  }

  /** características de um lance (a posição `pos` é a de ANTES do lance) */
  function features(E, pos, m) {
    const b = pos.b, from = m & 127, to = (m >> 7) & 127, promo = (m >> 14) & 7, flag = (m >> 17) & 7;
    const piece = b[from], t = piece & 7, color = piece >> 3;
    const capType = flag === 2 ? 1 : (b[to] & 7);
    const victimDefended = capType ? attackers(b, to, color ^ 1).length > 0 : false;
    const hangBefore = hanging(pos, color), oppBefore = hanging(pos, color ^ 1);
    const wasThreatened = hangBefore.find(x => x.sq === from);
    pos.make(m);
    const check = pos.inCheck();
    const mate = check && pos.legalMoves().length === 0;
    const hangAfter = hanging(pos, color), oppAfter = hanging(pos, color ^ 1);
    pos.unmake();
    const newThreats = oppAfter.filter(x => !oppBefore.some(y => y.sq === x.sq && y.t === x.t));
    const fixed = hangBefore.filter(x => x.sq !== from && !hangAfter.some(y => y.sq === x.sq));
    const endRank = color === 0 ? 7 : 0, rank = from >> 4;
    return {
      from, to, t, color, capType, victimDefended, promo, castle: flag === 3 || flag === 4, ep: flag === 2, check, mate,
      escaped: !!wasThreatened && !hangAfter.some(x => x.sq === to), threats: newThreats, fixed,
      leftHanging: hangAfter.filter(x => !hangBefore.some(y => y.sq === x.sq && y.t === x.t) || x.sq === to),
      develops: (t === 2 || t === 3) && (from >> 4) === (color === 0 ? 7 : 0), centerPawn: t === 1 && [51, 52, 67, 68].includes(to) && Math.abs((from >> 4) - (to >> 4)) === 2,
      kingMove: t === 6 && !(flag === 3 || flag === 4), queenMove: t === 5, backRank: rank === endRank
    };
  }
  const sq = (E, s) => E.sqName(s);

  /** por que este lance é bom */
  function whyGood(E, f, san, pos) {
    const out = [];
    if (f.mate) return ['dá xeque-mate!'];
    if (f.promo) out.push('promove o peão a ' + NAME[f.promo] + ', um ganho enorme de material');
    if (f.capType) {
      const nm = NAME[f.capType];
      if (!f.victimDefended) out.push(`captura ${GEN[f.capType]} em ${sq(E, f.to)}, que estava sem proteção: material de graça`);
      else if (VAL[f.capType] > VAL[f.t]) out.push(`captura ${GEN[f.capType]} em ${sq(E, f.to)} com ${GEN[f.t]}: uma troca vantajosa (você ganha ${VAL[f.capType] - VAL[f.t]} ponto(s) de material)`);
      else out.push(`captura ${GEN[f.capType]} em ${sq(E, f.to)} e deixa o material em vantagem ou igual`);
    }
    if (f.check) out.push('dá xeque e obriga o adversário a responder, ganhando tempo');
    if (f.castle) out.push('faz o roque: coloca o rei em segurança e ativa a torre');
    if (f.escaped) out.push(`tira ${GEN[f.t]} de um ataque (ela estava ameaçada)`);
    if (f.fixed.length) out.push(`protege ${GEN[f.fixed[0].t]} em ${sq(E, f.fixed[0].sq)}, que estava ameaçad${f.fixed[0].t === 5 || f.fixed[0].t === 4 ? 'a' : 'o'}`);
    if (f.threats.length && !f.capType) out.push(`cria uma ameaça: passa a atacar ${GEN[f.threats[0].t]} em ${sq(E, f.threats[0].sq)}`);
    if (f.develops) out.push(`desenvolve ${GEN[f.t]}, levando-${f.t === 4 ? 'a' : 'o'} para uma casa mais ativa`);
    if (f.centerPawn) out.push('ocupa o centro do tabuleiro com um peão, ganhando espaço');
    if (!out.length) out.push('mantém a melhor posição segundo a análise (peças mais ativas e rei seguro)');
    return out;
  }

  /** o que há de errado no lance jogado */
  function whyBad(E, fp, fb, res, san, replySan, replyFeat, movedBefore) {
    const out = [];
    if (res.playedScore < -MATE) out.push('permite um xeque-mate forçado do adversário');
    else if (res.bestScore > MATE && res.playedScore < MATE) out.push('deixa escapar um xeque-mate: havia uma sequência forçada para vencer');
    if (fp.leftHanging.length) {
      const h0 = fp.leftHanging.find(x => x.sq === fp.to) || fp.leftHanging[0];
      out.push(`deixa ${GEN[h0.t]} em ${sq(E, h0.sq)} desprotegid${h0.t === 4 || h0.t === 5 ? 'a' : 'o'} ou atacad${h0.t === 4 || h0.t === 5 ? 'a' : 'o'} por ${GEN[h0.by]}`);
    }
    if (replyFeat && replyFeat.capType && (!replyFeat.victimDefended || VAL[replyFeat.capType] > VAL[replyFeat.t]) && !out.some(s => /xeque-mate/.test(s)))
      out.push(`o adversário pode responder ${replySan}, capturando ${GEN[replyFeat.capType]} em ${sq(E, replyFeat.to)}`);
    if (fb && fb.capType && !fb.victimDefended && !fp.capType) out.push(`deixa passar uma captura de graça (${GEN[fb.capType]} em ${sq(E, fb.to)})`);
    else if (fb && fb.check && !fp.check && fb.threats.length) out.push('desperdiça uma chance de atacar com tempo');
    if (fp.queenMove && movedBefore < 8) out.push('tirar a dama cedo costuma ajudar o adversário a ganhar tempo atacando-a');
    if (fp.kingMove && movedBefore < 25) out.push('mexer o rei sem necessidade faz você perder o direito de roque');
    return out;
  }

  const GRADES = {
    book: { icon: '📖', title: 'Lance de teoria', cls: 'best' },
    best: { icon: '⭐', title: 'Melhor lance!', cls: 'best' },
    excellent: { icon: '✅', title: 'Excelente', cls: 'excellent' },
    good: { icon: '👍', title: 'Bom lance', cls: 'good' },
    inaccuracy: { icon: '⚠️', title: 'Imprecisão', cls: 'inaccuracy' },
    mistake: { icon: '❌', title: 'Erro', cls: 'mistake' },
    blunder: { icon: '💥', title: 'Erro grave', cls: 'blunder' }
  };
  const fmtEval = s => { if (Math.abs(s) > MATE) return s > 0 ? '+M' : '-M'; const v = (Math.round(s / 10) / 10); return (v > 0 ? '+' : '') + (v === 0 ? '0.0' : v.toFixed(1)); };
  const accuracy = loss => Math.round(100 * Math.exp(-Math.max(0, loss) / 180));

  /** d: {fen, moves[], played}; res: resultado de analyzeCore -> explicação para a interface */
  function review(E, d, res) {
    const g = new E.Game(d.fen);
    for (const m of d.moves) g.play(m);
    const pos = g.pos, moveNo = Math.floor(g.history.length / 2) + 1;
    const playedSan = g.san(d.played), bestSan = g.san(res.best);
    const loss = res.best === d.played ? 0 : Math.max(0, res.bestScore - res.playedScore);
    let grade;
    if (res.best === d.played) grade = 'best';
    else if (res.bestScore > MATE && res.playedScore < MATE) grade = 'blunder';
    else if (loss <= 18) grade = 'excellent';
    else if (loss <= 50) grade = 'good';
    else if (loss <= 120) grade = 'inaccuracy';
    else if (loss <= 280) grade = 'mistake';
    else grade = 'blunder';
    const fp = features(E, pos, d.played), fb = res.best === d.played ? fp : features(E, pos, res.best);
    // lance de teoria (livro de aberturas): nunca é punido por pequenas diferenças do motor
    if (d.book && grade !== 'best' && loss <= 60) grade = 'book';
    const lines = [];
    if (grade === 'book') {
      lines.push(`${playedSan} é um lance de teoria: ${d.book}. Os mestres jogam essa posição há décadas.`);
      lines.push(`Ideia do lance: ${whyGood(E, fp, playedSan, pos).join('; ')}.`);
    } else if (grade === 'best' || grade === 'excellent') {
      lines.push(`${playedSan} ${whyGood(E, fp, playedSan, pos).join('; ')}.`);
      if (grade === 'excellent' && res.best !== d.played) lines.push(`O motor preferia ${bestSan}, mas a diferença é mínima.`);
    } else {
      let replySan = '', replyFeat = null;
      if (res.reply) {
        const g2 = new E.Game(d.fen); for (const m of d.moves) g2.play(m); g2.play(d.played);
        replySan = g2.san(res.reply); replyFeat = features(E, g2.pos, res.reply);
      }
      const bad = whyBad(E, fp, fb, res, playedSan, replySan, replyFeat, moveNo);
      if (bad.length) lines.push(`Seu lance ${playedSan}: ${bad.join('; ')}.`);
      else lines.push(`Seu lance ${playedSan} cede cerca de ${(loss / 100).toFixed(1)} ponto(s) de vantagem comparado ao melhor.`);
      let wg = whyGood(E, fb, bestSan, pos);
      if (res.playedScore < -MATE && res.bestScore > -MATE) wg = wg.length === 1 && /^mantém a melhor/.test(wg[0]) ? ['evita o xeque-mate (cobre a casa ameaçada)'] : ['evita o xeque-mate'].concat(wg);
      lines.push(`Melhor seria ${bestSan}: ${wg.join('; ')}.`);
      if (grade === 'good') lines.unshift('Lance jogável, mas existe algo um pouco melhor.');
    }
    if (moveNo <= 6 && grade !== 'best' && grade !== 'book') lines.push('Dica de abertura: controle o centro, desenvolva cavalos e bispos, faça o roque cedo.');
    return { grade, ...GRADES[grade], playedSan, bestSan, best: res.best, played: d.played, loss, acc: accuracy(loss), eval: fmtEval(res.playedScore), evalNum: res.playedScore, lines, moveNo };
  }

  /** resumo da partida: contagem por categoria e precisão média */
  function summary(reviews) {
    const c = { best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, blunder: 0 };
    reviews.forEach(r => { c[r.grade === 'book' ? 'best' : r.grade]++; });
    const acc = reviews.length ? Math.round(reviews.reduce((a, r) => a + r.acc, 0) / reviews.length) : 0;
    return { counts: c, acc, n: reviews.length };
  }

  const api = { analyzeCore, review, summary, features, hanging, attackers, GRADES };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.ChessCoach = api;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : globalThis));
