/* Worker: roda a busca da IA e a análise do treinador fora da thread principal */
importScripts('chess-engine.js', 'chess-coach.js');
onmessage = function (e) {
  const d = e.data;
  if (d.kind === 'analyze') {
    let res = null;
    try { res = ChessCoach.analyzeCore(ChessEngine, d); } catch (err) { res = null; }
    postMessage({ id: d.id, kind: 'analyze', res });
    return;
  }
  const g = new ChessEngine.Game(d.fen);
  for (const m of d.moves) g.pos.make(m);          // reproduz o histórico (repetições)
  const s = new ChessEngine.Search(g.pos);
  const r = s.run(d.opts);
  postMessage({ id: d.id, move: r ? r.move : 0, score: r ? r.score : 0, depth: r ? r.depth : 0 });
};
