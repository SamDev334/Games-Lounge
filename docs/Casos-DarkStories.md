# Banco de Casos — Dark Stories

Três casos completos, no formato pedido para a equipe de desenvolvimento. Os textos são os mesmos do banco real (`js/darkstories-data.js`); este arquivo é gerado por `node tests/gerar-docs-dark.js`.

Cada caso tem: **Título**, **Enigma Público** (o que o jogador lê), **História Secreta Completa** (só o sistema/Mestre conhece), **Peças da solução** (o que uma teoria precisa cobrir) e **Gabarito de Perguntas-Chave** (pergunta → resposta esperada: **Sim**, **Não** ou **Irrelevante**).

---

## Caso 1 — O Palito Mais Curto
*Dificuldade: Médio · id: `palito`*

### Enigma Público
> Um homem é encontrado morto no meio de um campo aberto. Não há sinais de briga nem de arma, não há nenhum veículo por perto e, na mão, ele segura um palito de fósforo curto.

### História Secreta Completa
O homem estava num balão de ar quente que perdia altura e ia cair. Para aliviar o peso, os ocupantes combinaram sortear com palitos: quem tirasse o menor teria que saltar. Ele tirou o palito mais curto e pulou do balão — morreu na queda.

### Peças da solução (uma teoria só vence se cobrir as marcadas como obrigatórias e ao menos 3 no total)
- Estavam num balão **(obrigatória)**
- O balão perdia altura e precisava ficar mais leve
- Fizeram um sorteio com palitos
- Ele tirou o palito curto, saltou e morreu na queda

### Dicas (progressivas, só sob pedido)
1. A morte foi consequência de uma decisão tomada em grupo.
2. Ele estava num veículo que flutua.
3. Alguém precisou saltar para os outros se salvarem.

### Gabarito de Perguntas-Chave
| # | Pergunta do jogador | Resposta esperada |
|---|---------------------|-------------------|
| 1 | Ele foi assassinado? | **Não** |
| 2 | Foi suicídio? | **Não** |
| 3 | Foi um acidente? | **Não** |
| 4 | Ele estava sozinho antes de morrer? | **Não** |
| 5 | Ele caiu de um lugar alto? | **Sim** |
| 6 | Ele estava dentro de um veículo antes? | **Sim** |
| 7 | Ele estava num avião? | **Não** |
| 8 | Ele estava num helicóptero? | **Não** |
| 9 | Tem a ver com sorte ou sorteio? | **Sim** |
| 10 | O fósforo tem a ver com fogo ou incêndio? | **Não** |
| 11 | Alguém o empurrou? | **Não** |
| 12 | Outras pessoas participaram da decisão? | **Sim** |
| 13 | Ele tinha uma doença? | **Não** |
| 14 | Ele estava voando? | **Sim** |
| 15 | O palito é importante para a explicação? | **Sim** |

---

## Caso 2 — A Arma que Sumiu
*Dificuldade: Médio · id: `arma-gelo`*

### Enigma Público
> Um homem é encontrado morto, com um ferimento fundo no peito, no meio do próprio escritório trancado por dentro. A polícia revista a sala inteira, mas não encontra a arma do crime. A única coisa estranha é uma poça d'água no tapete.

### História Secreta Completa
A arma era uma lâmina de gelo (um grande pingente de gelo afiado). O assassino a usou e foi embora; o gelo derreteu, restando apenas a poça d'água no tapete — e nenhuma arma para ser encontrada.

### Peças da solução (uma teoria só vence se cobrir as marcadas como obrigatórias e ao menos 2 no total)
- A arma era feita de gelo **(obrigatória)**
- O gelo derreteu e virou a poça d'água

### Dicas (progressivas, só sob pedido)
1. Pense no que desaparece com o tempo e deixa só água.
2. A arma não era de metal.
3. O assassino nem precisou levar a arma embora.

### Gabarito de Perguntas-Chave
| # | Pergunta do jogador | Resposta esperada |
|---|---------------------|-------------------|
| 1 | Foi um acidente? | **Não** |
| 2 | Foi uma arma de fogo? | **Não** |
| 3 | A arma parecia uma faca? | **Sim** |
| 4 | A arma ainda está na sala? | **Não** |
| 5 | A poça d'água tem a ver com a morte? | **Sim** |
| 6 | O assassino levou a arma embora? | **Não** |
| 7 | A arma desapareceu sozinha? | **Sim** |
| 8 | A temperatura é importante? | **Sim** |
| 9 | Foi envenenamento? | **Não** |
| 10 | O assassino conhecia a vítima? | **Irrelevante** |
| 11 | O assassino estava na sala quando a polícia chegou? | **Não** |
| 12 | O crime foi planejado? | **Sim** |
| 13 | A arma foi comprada numa loja? | **Não** |
| 14 | Era inverno? | **Irrelevante** |

---

## Caso 3 — O Faroleiro
*Dificuldade: Médio · id: `faroleiro`*

### Enigma Público
> Numa noite de tempestade, um faroleiro dorme tranquilamente no alto do farol. Quando acorda de manhã, descobre que dezenas de pessoas morreram durante a noite.

### História Secreta Completa
O faroleiro tinha a obrigação de manter a luz do farol acesa durante a noite, mas dormiu sem acendê-la. Um navio, sem enxergar a costa na tempestade, bateu nas rochas e naufragou; vários tripulantes e passageiros morreram.

### Peças da solução (uma teoria só vence se cobrir as marcadas como obrigatórias e ao menos 2 no total)
- O faroleiro não acendeu a luz do farol **(obrigatória)**
- Um navio/barco estava no mar **(obrigatória)**
- O navio bateu nas rochas e naufragou

### Dicas (progressivas, só sob pedido)
1. O trabalho do faroleiro era muito importante naquela noite.
2. Quem morreu estava no mar.
3. O que um farol precisa estar fazendo à noite?

### Gabarito de Perguntas-Chave
| # | Pergunta do jogador | Resposta esperada |
|---|---------------------|-------------------|
| 1 | O faroleiro matou alguém com as próprias mãos? | **Não** |
| 2 | Foi culpa do faroleiro? | **Sim** |
| 3 | O farol estava quebrado? | **Não** |
| 4 | As pessoas morreram afogadas? | **Sim** |
| 5 | Havia um navio ou barco envolvido? | **Sim** |
| 6 | O faroleiro devia ter feito algo antes de dormir? | **Sim** |
| 7 | A luz do farol era importante? | **Sim** |
| 8 | Foi um terremoto ou tsunami? | **Não** |
| 9 | A tempestade teve influência? | **Sim** |
| 10 | Ele dormiu de propósito para que as pessoas morressem? | **Não** |
| 11 | Ele dormiu sem acender a luz? | **Sim** |
| 12 | O faroleiro foi punido? | **Irrelevante** |
| 13 | Era noite? | **Sim** |
| 14 | As pessoas morreram dentro do farol? | **Não** |

---

> **Nota:** no jogo, o narrador automático também usa a resposta intermediária “Sim e não”. O gabarito acima resolve esses casos para a forma estrita (Sim/Não/Irrelevante) usada pelo Mestre de IA.
