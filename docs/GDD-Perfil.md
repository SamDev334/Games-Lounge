# Perfil — Game Design Document (resumo)

> Implementação: [`js/perfil.js`](../js/perfil.js) · cartas: [`js/perfil-data.js`](../js/perfil-data.js) · comparador: [`js/textutil.js`](../js/textutil.js) · online: [`js/party.js`](../js/party.js)
> Exemplo de cartas em JSON: [`docs/perfil-exemplo.json`](perfil-exemplo.json)

## 1. Visão geral

**Objetivo.** Descobrir a identidade secreta de uma carta (uma **Pessoa**, um **Lugar**, uma **Coisa** ou um **Ano**) a partir de **20 dicas** reveladas uma a uma, da mais vaga para a mais óbvia. Vence quem somar mais pontos ao final das rodadas.

**Público-alvo.** Famílias, grupos de amigos e jogadores casuais a partir de ~10 anos; quem gosta de quiz, cultura geral e jogos de festa. Partidas curtas (8 rodadas ≈ 10–15 min), sem necessidade de conhecer regras complexas.

**Plataformas e modos.**

| Modo | Descrição |
|------|-----------|
| 🎓 Treino solo | Você contra o baralho. Errar um palpite revela a próxima dica automaticamente. Guarda o recorde. |
| 🤖 Contra IAs | 2–6 jogadores (você + IAs com personalidades). Cada dica é revelada para um jogador, em sequência. |
| 🌐 Online | Anfitrião + até 5 amigos (vagas livres viram IAs). 45 s por vez; o anfitrião guarda a resposta. |

**Pilares de design.** (1) A recompensa por arriscar cedo é clara e visível (“pontos em jogo”). (2) Errar custa caro, mas não elimina do jogo. (3) A resposta é aceita de forma generosa (acentos, apelidos, erros de digitação).

## 2. Categorias e estrutura das cartas

| Categoria | Pergunta | Exemplos no baralho |
|-----------|----------|---------------------|
| 🧑 Pessoa | Quem sou eu? | Santos Dumont, Pelé, Einstein, Da Vinci, Senna, Cleópatra |
| 📍 Lugar | Que lugar sou eu? | Cristo Redentor, Torre Eiffel, Machu Picchu, Floresta Amazônica, Muralha da China, Antártida |
| 🧰 Coisa | O que sou eu? | Bússola, guarda-chuva, espelho, geladeira, violão, óculos |
| 📅 Ano | Que ano é este? | 1500, 1789, 1822, 1888, 1945, 1969 |

Cada carta tem: `id` único, `cat`, `answer` (nome de exibição), `aliases[]` (respostas aceitas) e **exatamente 20 dicas** ordenadas da **mais vaga (dica 1)** para a **mais óbvia (dica 20)**.

**Regras de redação das dicas**

1. Dica 1–5: contexto amplo (época, região, natureza). Nunca identificam sozinhas.
2. Dica 6–14: fatos específicos e verificáveis que reduzem o campo a poucas respostas.
3. Dica 15–19: pistas muito fortes (nome de obra, cidade, data famosa).
4. Dica 20: quase entrega a resposta (letra inicial, número de letras, “meu nome é…”).
5. Em cartas de **Ano**, nunca escrever o número do ano nas dicas 1–19 (só eventos).
6. Nenhuma dica das 16 primeiras pode conter palavras fortes da resposta (o teste automático avisa).

## 3. Sistema de pontuação

Pontuação **regressiva**: `pontos = 21 − n`, onde `n` é o número de dicas já reveladas quando o jogador acerta.

| Dica revelada (n) | 1 | 2 | 3 | … | 10 | … | 19 | 20 |
|-------------------|---|---|---|---|----|---|----|----|
| Pontos | **20** | 19 | 18 | … | 11 | … | 2 | **1** |

**Turnos.** A dica `n` é “jogada” pelo jogador da vez. Ele pode **chutar** ou **passar**; depois a dica `n+1` é revelada e o turno vai para o próximo jogador que ainda esteja na rodada. O jogador que abre a rodada alterna a cada rodada.

**Erro.** Quem erra um palpite fica **fora da rodada** (mantém os pontos). No **treino solo** o erro não elimina: apenas revela a próxima dica.

**Fim da rodada.** Alguém acerta (ganha `21 − n`), ou todos erram, ou as 20 dicas acabam (ninguém pontua). A resposta e todas as dicas são mostradas.

**Fim do jogo.** Após o número de rodadas escolhido (5, 8 ou 12), vence a maior pontuação (empates dividem a vitória).

## 4. Arquitetura de dados (banco de cartas)

Esquema de cada carta:

```json
{
  "id": "string única (slug)",
  "cat": "pessoa | lugar | coisa | ano",
  "answer": "nome de exibição",
  "aliases": ["respostas aceitas"],
  "clues": ["dica 1 (20 pts, mais vaga)", "…", "dica 20 (1 pt, mais óbvia)"]
}
```

O arquivo real é um array `window.PERFIL_CARDS` em `js/perfil-data.js`. Para acrescentar cartas, basta incluir novos objetos nesse array e rodar `node tests/perfil-dark.js`, que valida: 20 dicas por carta, ids únicos, aliases coerentes, vazamentos da resposta nas primeiras dicas e falsos positivos entre cartas.

### Exemplo (4 entidades, uma por categoria)

Veja o arquivo completo em [`docs/perfil-exemplo.json`](perfil-exemplo.json). Ele é gerado a partir do banco real (`node tests/gerar-exemplo-perfil.js`).

```json
{
  "cartas": [
    {
      "id": "santos-dumont",
      "cat": "pessoa",
      "answer": "Santos Dumont",
      "aliases": [
        "Santos Dumont",
        "Alberto Santos Dumont",
        "Dumont"
      ],
      "clues": [
        "Nasci no século XIX, numa família de fazendeiros de café.",
        "Meu pai era engenheiro e muito rico.",
        "Nasci em Minas Gerais, mas cresci entre cafezais do interior paulista.",
        "Ainda menino, eu já dirigia as máquinas a vapor e locomotivas da fazenda.",
        "Eu devorava os livros de Júlio Verne.",
        "Ainda jovem, mudei-me para a França.",
        "Em Paris, virei celebridade da alta sociedade.",
        "Meus colarinhos altos e chapéus viraram moda.",
        "Comecei voando em balões; o primeiro se chamou \"Brasil\".",
        "Depois criei dirigíveis, ou seja, balões com motor.",
        "Em 1901, contornei uma famosa torre de ferro com um deles.",
        "Com esse feito ganhei o Prêmio Deutsch e dividi o dinheiro com meus mecânicos e com os pobres de Paris.",
        "Um amigo joalheiro fez para mim um relógio de pulso, para eu ver a hora durante o voo.",
        "Minha máquina mais famosa era mais pesada que o ar e decolou sozinha.",
        "O nome dela tem um número e a palavra \"bis\".",
        "Ela voou em Paris, em outubro de 1906.",
        "Muitos brasileiros me chamam de Pai da Aviação.",
        "Um aeroporto do centro do Rio de Janeiro leva o meu nome.",
        "Uma cidade de Minas Gerais tem o meu nome e sobrenome.",
        "Sou o brasileiro do 14-Bis, e meu nome é Alberto..."
      ]
    },
    {
      "id": "cristo",
      "cat": "lugar",
      "answer": "Cristo Redentor",
      "aliases": [
        "Cristo Redentor",
        "Cristo",
        "Cristo do Corcovado",
        "Redentor"
      ],
      "clues": [
        "Fico num país tropical de dimensões continentais.",
        "Fico no alto de uma montanha, no meio de uma grande cidade.",
        "De longe, sou visto de várias praias.",
        "Estou cercado por uma floresta dentro da cidade: a Floresta da Tijuca.",
        "Dá para subir até mim de trem.",
        "Fui inaugurado em 1931.",
        "Sou feito de concreto armado, revestido de pequenos mosaicos de pedra-sabão.",
        "Fui projetado por um engenheiro brasileiro e um escultor francês.",
        "Meu estilo é Art Déco.",
        "Tenho cerca de 30 metros de altura, sem contar o pedestal.",
        "Minha envergadura, de uma ponta a outra, é de 28 metros.",
        "Costumo ser atingido por raios.",
        "Estou sempre de braços abertos.",
        "Em 2007, fui eleito uma das Sete Maravilhas do Mundo Moderno.",
        "Fico no morro do Corcovado.",
        "Represento uma figura religiosa cristã.",
        "Meu nome lembra Jesus.",
        "Sou o maior cartão-postal do Rio de Janeiro.",
        "Abro os braços sobre a Baía de Guanabara e o Pão de Açúcar.",
        "Sou uma estátua gigante chamada Cristo ..."
      ]
    },
    {
      "id": "bussola",
      "cat": "coisa",
      "answer": "Bússola",
      "aliases": [
        "Bússola",
        "Bussola",
        "Bússola magnética"
      ],
      "clues": [
        "Sou um objeto pequeno, que cabe na palma da mão.",
        "Não preciso de pilha nem de energia elétrica.",
        "Meus ancestrais eram feitos de uma pedra magnética chamada magnetita.",
        "Surgi na China, há mais de mil anos.",
        "No começo, ajudava até a orientar a construção de casas e cidades.",
        "Os navegadores me usaram para atravessar oceanos.",
        "Sou importante em dias de névoa, quando não se vê o sol nem as estrelas.",
        "Tenho um mostrador com letras como N, S, L e O.",
        "Dentro de mim há uma agulha imantada que gira livremente.",
        "Ela se alinha com o campo magnético da Terra.",
        "Ela aponta para o norte magnético, e não exatamente para o geográfico.",
        "Escoteiros e exploradores me carregam em trilhas.",
        "Os celulares modernos têm uma versão eletrônica minha.",
        "Ajudo você a se orientar.",
        "Minha agulha aponta sempre para o mesmo lado.",
        "Funciono graças ao magnetismo.",
        "Mostro onde fica o norte.",
        "Sou um instrumento de orientação com agulha magnética.",
        "Meu nome termina com A e começa com B.",
        "Sou a ... (instrumento que aponta para o norte)."
      ]
    },
    {
      "id": "ano-1969",
      "cat": "ano",
      "answer": "1969",
      "aliases": [
        "1969"
      ],
      "clues": [
        "Neste ano, o mundo vivia a Guerra Fria.",
        "Os Estados Unidos estavam em guerra no Vietnã.",
        "O Brasil vivia sob um regime militar.",
        "Um avião supersônico de passageiros fez seu primeiro voo: o Concorde.",
        "Os Beatles deram seu último show, no telhado de um prédio em Londres.",
        "No fim de junho, protestos no bar Stonewall, em Nova York, marcaram a luta LGBT.",
        "Em julho, três astronautas partiram de Cabo Canaveral numa nave Apollo.",
        "Quatro dias depois, dois deles pisaram na Lua.",
        "O comandante era Neil Armstrong.",
        "Ele disse: \"Um pequeno passo para o homem, um salto gigante para a humanidade.\"",
        "Cerca de 600 milhões de pessoas assistiram pela TV.",
        "Em agosto, um festival reuniu cerca de 400 mil pessoas numa fazenda de Nova York: Woodstock.",
        "Em outubro, a primeira mensagem entre dois computadores foi enviada na ARPANET, a \"avó\" da internet.",
        "Em novembro, Pelé marcou seu milésimo gol, no Maracanã.",
        "Foi o ano em que o ser humano pisou na Lua.",
        "Foi o último ano da década de 1960.",
        "Um ano depois, o Brasil seria tricampeão mundial de futebol no México.",
        "Sou o ano da missão Apollo 11.",
        "Começo com mil novecentos e sessenta e ...",
        "Sou o ano da chegada à Lua."
      ]
    }
  ]
}
```

## 5. Lógica de jogo

### 5.1 Inicialização da partida e sorteio da carta

```js
function makeDeck(cat, n) {
  const seen = store.get('perfil.seen', {});                       // quantas vezes cada carta já saiu
  let pool = CARDS.filter(c => cat === 'todas' || c.cat === cat);
  pool = shuffle(pool).sort((a, b) => (seen[a.id] || 0) - (seen[b.id] || 0));   // menos vistas primeiro
  const deck = [];
  while (deck.length < n) deck.push(...shuffle(pool));              // repõe se faltar carta
  return deck.slice(0, n);
}

function newState(seats, cfg) {
  return { players: seats.map(s => ({ ...s, score: 0, locked: false })),
           rounds: cfg.rounds, round: 0, clueNo: 0, turn: 0, phase: 'play',
           card: null, ask: null, deck: makeDeck(cfg.cat, cfg.rounds) };
}
```

### 5.2 Gerenciamento de estado

| Campo | Significado |
|-------|-------------|
| `clueNo` | quantas dicas estão visíveis (1–20) → pontos em jogo = `21 − clueNo` |
| `turn` / `ask` | jogador da vez e o pedido de ação em andamento (`{id, seat, uid}`) |
| `players[i].score / locked` | pontuação e se já errou nesta rodada |
| `phase` | `play` → `reveal` → … → `over` |

```js
async function playRound(S) {
  S.clueNo = 1; S.players.forEach(p => p.locked = false);
  while (S.clueNo <= 20) {
    const p = nextActivePlayer(S);  if (!p) break;                  // todos fora
    const a = await getAction(p);                                    // humano local, IA ou convidado remoto
    if (a.type === 'guess' && checkGuess(a.s, S.card.aliases).ok) {
      p.score += 21 - S.clueNo;  return;                             // acertou: encerra a rodada
    }
    if (a.type === 'guess' && !S.solo) p.locked = true;              // errou: fora da rodada
    S.clueNo++;  S.turn = (S.turn + 1) % S.players.length;           // revela a próxima dica
  }
}
```

### 5.3 Verificação de palpite (variações e sinônimos aproximados)

`TextUtil.matchAnswer(guess, aliases)` em `js/textutil.js`:

1. **Normalização**: minúsculas, remoção de acentos e pontuação (`"Pelé!"` → `pele`).
2. **Palavras relevantes**: descarta artigos e preposições (`o a de da do e ano …`).
3. **Sinônimos/apelidos**: cada carta lista `aliases` (`"Dumont"`, `"Edson"`, `"Grande Muralha"`, `"Sombrinha"`…).
4. **Tolerância a erros** por tamanho da palavra, com distância de edição que conta *troca de letras vizinhas* como 1 erro: até 3 letras = exato · 4–7 letras = 1 erro · 8+ letras = 2 erros. Números (anos) só casam exatos.
5. **Todas as palavras do apelido** precisam aparecer no palpite (em qualquer ordem); sobras são toleradas (“acho que é o Santos Dumont”).
6. **Palavras coladas/separadas**: `guardachuva`, `machu pichu` também casam.

```js
function matchAnswer(guess, aliases) {
  const gt = toks(guess);
  for (const al of aliases) {
    const at = toks(al);
    if (gt.length > at.length + 3) continue;                         // evita “redações”
    if (at.every(a => gt.some(g => sameTok(a, g)))) return { ok: true, alias: al };
    if (levenshtein(gt.join(''), at.join('')) <= tol(at.join('').length)) return { ok: true, alias: al };
  }
  return { ok: false };
}
```

### 5.4 IA

Cada IA sorteia por rodada um “ponto de certeza” `k` (dica em que reconhece a resposta), ajustado pela personalidade e pelo nível (Fácil +3, Difícil −2). Antes de `k` ela passa (a *Palpiteira* chuta por impulso); a partir de `k` acerta com probabilidade `q` (70–97%) ou erra com um palpite plausível da mesma categoria.

## 6. Multiplayer (online)

Arquitetura **anfitrião-autoritativo** sobre o Firebase Realtime Database (mesma usada em Poker, Truco e Detetive), encapsulada em [`js/party.js`](../js/party.js):

- O **anfitrião** roda o jogo, sorteia a carta e publica o estado em `rooms/<rid>/pub` (só as **dicas já reveladas**; a resposta só é publicada na revelação da rodada).
- Cada **convidado** lê `pub` e envia ações em `rooms/<rid>/act/<uid>`: `{id, type: 'guess'|'pass', a: <id do pedido>, s: <texto>}`.
- O anfitrião valida o palpite e ignora ações de quem não é o jogador da vez (campo `a` precisa casar com o pedido atual).
- **Tempo**: 45 s por vez; ao estourar (ou se o jogador cair offline) o anfitrião passa a vez.
- Convites, amigos e presença usam o `social.js`; vagas livres viram IAs.
- As regras de segurança estão em `database.rules.json` (a ação aceita o campo `s`, até 160 caracteres).

## 7. Roteiro de evolução

Mais cartas e categorias (Animal, Filme, Esporte); modo “tempo real” (dicas automáticas a cada N segundos); dificuldade por carta; estatísticas por categoria; cartas enviadas pela comunidade (com revisão).
