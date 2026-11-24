/* ============================================================
   PERFIL — mais cartas (total 40) e dificuldade de cada carta
   d: 1 = muito conhecida · 2 = média · 3 = difícil (a IA usa isso)
   Carregue DEPOIS de perfil-data.js
   ============================================================ */
(function () {
  'use strict';
  const C = window.PERFIL_CARDS;
  C.push(
    // ===================== PESSOA =====================
    {
      id: 'marie-curie', cat: 'pessoa', answer: 'Marie Curie', aliases: ['Marie Curie', 'Madame Curie', 'Curie', 'Maria Curie', 'Maria Sklodowska'],
      clues: [
        'Nasci no século XIX, num país europeu que, na época, nem existia como nação independente.',
        'Fui uma aluna brilhante, mas as universidades do meu país não aceitavam mulheres.',
        'Aos 24 anos, mudei-me para Paris para estudar na Sorbonne.',
        'Estudava tanto que, nos invernos, quase passava fome e frio.',
        'Casei-me com um colega cientista chamado Pierre.',
        'Trabalhávamos num galpão simples, quase sem equipamentos.',
        'Criei a palavra "radioatividade".',
        'Em 1898, descobri dois elementos químicos novos.',
        'Um deles recebeu o nome do meu país de origem: polônio.',
        'O outro, o rádio, brilhava no escuro.',
        'Em 1903, ganhei o Nobel de Física, junto com meu marido e Henri Becquerel.',
        'Em 1906, meu marido morreu atropelado por uma carroça, e eu assumi as aulas dele: fui a primeira professora da Universidade de Paris.',
        'Em 1911, ganhei um segundo Nobel, agora de Química.',
        'Fui a primeira pessoa a ganhar dois prêmios Nobel em ciências diferentes.',
        'Fui também a primeira mulher a receber um Nobel.',
        'Na Primeira Guerra, criei unidades móveis de raios X para socorrer os feridos.',
        'Minha filha Irène também ganhou um Nobel.',
        'Morri em 1934, provavelmente por causa da exposição à radiação.',
        'Até hoje, meus cadernos de anotações são radioativos.',
        'Uma unidade de medida de radioatividade leva meu sobrenome de casada. Sou Marie ...'
      ]
    },
    {
      id: 'tiradentes', cat: 'pessoa', answer: 'Tiradentes', aliases: ['Tiradentes', 'Joaquim José da Silva Xavier', 'Tira Dentes', 'Tira-dentes'],
      clues: [
        'Nasci no século XVIII, numa fazenda do interior do Brasil.',
        'Fiquei órfão ainda criança e tive pouca escola.',
        'Cresci em Minas Gerais, região famosa pelo ouro.',
        'Fui tropeiro, minerador e militar, tudo ao mesmo tempo.',
        'Também exercia um ofício ligado à saúde das pessoas.',
        'Meu apelido nasceu desse ofício e tem a ver com a boca dos pacientes.',
        'O governo de Portugal cobrava impostos altíssimos sobre o ouro.',
        'Havia uma cobrança, chamada "derrama", que deixava todos furiosos.',
        'Conversei com poetas, padres e militares sobre libertar o Brasil.',
        'Nosso movimento foi planejado em Vila Rica.',
        'Queríamos uma república, uma universidade e liberdade para o Brasil.',
        'Um dos conspiradores nos denunciou ao governo.',
        'Fui preso no Rio de Janeiro, em 1789.',
        'Fiquei três anos na prisão antes da sentença.',
        'Fui o único do grupo condenado à morte; os outros foram exilados.',
        'Fui enforcado em 21 de abril de 1792.',
        'Meu corpo foi dividido e minha cabeça exposta em Vila Rica, como exemplo.',
        'Depois da República, virei herói nacional.',
        'O dia da minha morte é feriado no Brasil.',
        'Sou o mártir da Inconfidência Mineira, o "tira-dentes".'
      ]
    },
    {
      id: 'machado', cat: 'pessoa', answer: 'Machado de Assis', aliases: ['Machado de Assis', 'Machado', 'Assis', 'Bruxo do Cosme Velho'],
      clues: [
        'Nasci no Rio de Janeiro, no século XIX, numa família muito humilde.',
        'Meu pai era pintor de paredes.',
        'Quase não frequentei escola: aprendi sozinho, lendo muito.',
        'Comecei a vida trabalhando como aprendiz numa gráfica.',
        'Aprendi francês e inglês por conta própria.',
        'Tive epilepsia, mas nunca parei de escrever.',
        'Casei-me com uma portuguesa chamada Carolina, minha companheira para a vida toda.',
        'Fui jornalista, poeta, cronista, contista e dramaturgo.',
        'Escrevi um conto em que um médico interna a cidade inteira num hospício: "O Alienista".',
        'Um dos meus romances é narrado por um defunto.',
        'Ele começa dedicando o livro "ao verme que primeiro roeu as frias carnes do meu cadáver".',
        'Outro romance discute até hoje se uma mulher de "olhos de ressaca" traiu o marido.',
        'Essa personagem se chama Capitu.',
        'O narrador desse livro é o Bentinho, que vira "Dom Casmurro".',
        'Fui o primeiro presidente da Academia Brasileira de Letras.',
        'Morri em 1908, no Rio de Janeiro.',
        'Sou considerado o maior escritor da literatura brasileira.',
        'Minha escrita tem ironia fina e narradores que conversam com o leitor.',
        'Um dos meus apelidos é "Bruxo do Cosme Velho".',
        'Sou o autor de Dom Casmurro: ... de Assis.'
      ]
    },
    {
      id: 'newton', cat: 'pessoa', answer: 'Isaac Newton', aliases: ['Isaac Newton', 'Newton', 'Sir Isaac Newton'],
      clues: [
        'Nasci na Inglaterra, no século XVII, num dia de Natal.',
        'Meu pai morreu antes de eu nascer.',
        'Dizem que nasci tão pequeno que cabia numa caneca.',
        'Estudei na Universidade de Cambridge.',
        'Em 1665, uma epidemia de peste fechou a universidade e fui trabalhar em casa.',
        'Nesse isolamento, tive as ideias mais importantes da minha vida.',
        'Usei um prisma para mostrar que a luz branca é feita de várias cores.',
        'Construí um tipo de telescópio que usa espelhos, e não lentes.',
        'Desenvolvi um ramo da matemática chamado cálculo.',
        'Briguei durante anos com o alemão Leibniz sobre quem o inventou.',
        'Uma lenda diz que vi uma fruta cair de uma árvore e pensei na gravidade.',
        'Segundo a lenda, a fruta era uma maçã.',
        'Em 1687, publiquei o livro "Principia".',
        'Nele, expliquei as três leis do movimento.',
        'Também expliquei a lei da gravitação universal.',
        'Fui diretor da Casa da Moeda da Inglaterra.',
        'Presidi a Royal Society e recebi o título de "Sir".',
        'Morri em 1727 e fui enterrado na Abadia de Westminster.',
        'Uma unidade de força foi batizada com o meu sobrenome.',
        'Sou Sir Isaac ..., o cientista da gravidade.'
      ]
    },

    // ===================== LUGAR =====================
    {
      id: 'piramides', cat: 'lugar', answer: 'Pirâmides de Gizé', aliases: ['Pirâmides de Gizé', 'Pirâmides de Giza', 'Pirâmide de Gizé', 'Pirâmides do Egito', 'Pirâmides', 'Gizé', 'Giza', 'Grande Pirâmide'],
      clues: [
        'Fui construída há mais de quatro mil anos.',
        'Fico num país do nordeste da África.',
        'Meus construtores viviam às margens de um grande rio.',
        'Servi de túmulo para governantes que eram considerados deuses vivos.',
        'Fui feita com milhões de blocos de pedra.',
        'Cada bloco pesa, em média, mais do que um carro pequeno.',
        'Durante cerca de 3.800 anos fui a construção mais alta do mundo.',
        'Minha forma é um triângulo visto de qualquer um dos quatro lados.',
        'Originalmente fui revestida de calcário branco polido, que brilhava ao sol.',
        'Dentro de mim há câmaras e corredores estreitos.',
        'A maior de nós pertenceu ao faraó Quéops.',
        'Somos três grandes construções vizinhas, de tamanhos diferentes.',
        'Perto de nós, uma estátua com corpo de leão e rosto humano vigia o deserto.',
        'Essa estátua se chama Esfinge.',
        'Fico na periferia do Cairo, a capital do meu país.',
        'Sou a única das Sete Maravilhas do Mundo Antigo que ainda está de pé.',
        'Meu nome vem de uma cidade vizinha, na margem do Nilo.',
        'Sou o símbolo máximo do Egito antigo.',
        'Sou um conjunto de enormes túmulos de formato triangular.',
        'Sou as Pirâmides de ...'
      ]
    },
    {
      id: 'coliseu', cat: 'lugar', answer: 'Coliseu', aliases: ['Coliseu', 'Colosseum', 'Anfiteatro Flaviano', 'Coliseu de Roma', 'Coliseo'],
      clues: [
        'Fui inaugurado no ano 80 depois de Cristo.',
        'Comecei a ser construído por um imperador chamado Vespasiano.',
        'Meu formato é oval, e não redondo.',
        'Cabiam em mim cerca de 50 mil pessoas.',
        'Eu era a maior arena do mundo romano.',
        'Tenho 80 entradas numeradas, para a plateia entrar rápido.',
        'Um toldo gigante protegia o público do sol.',
        'Sob o chão da arena havia corredores e jaulas.',
        'Ali eram apresentados espetáculos com animais selvagens.',
        'Também aconteciam lutas entre guerreiros chamados gladiadores.',
        'Os imperadores ofereciam "pão e circo" ao povo.',
        'Terremotos e incêndios me danificaram ao longo dos séculos.',
        'Na Idade Média, levaram minhas pedras e mármores para construir outros prédios.',
        'Meu nome pode vir de uma enorme estátua de Nero que ficava por perto.',
        'Hoje sou um dos monumentos mais visitados do mundo.',
        'Em 2007, fui eleito uma das Sete Maravilhas do Mundo Moderno.',
        'Fico na Itália, no centro da capital.',
        'Fico ao lado do Fórum Romano.',
        'Sou o símbolo da antiga Roma.',
        'Meu nome em português começa com "Coli..." e o oficial é Anfiteatro Flaviano.'
      ]
    },
    {
      id: 'iguacu', cat: 'lugar', answer: 'Cataratas do Iguaçu', aliases: ['Cataratas do Iguaçu', 'Cataratas do Iguazu', 'Iguaçu', 'Iguazu', 'Cataratas', 'Foz do Iguaçu'],
      clues: [
        'Sou formada por um rio e por quedas gigantescas no meio da floresta.',
        'Fico na divisa entre dois países da América do Sul.',
        'Meu nome, na língua guarani, significa "água grande".',
        'Sou formada por cerca de 275 quedas.',
        'Ocupo quase três quilômetros de extensão.',
        'Estou cercada por uma floresta com quatis, tucanos e borboletas coloridas.',
        'Um europeu me avistou pela primeira vez em 1541.',
        'Perto de mim fica a fronteira onde também aparece o Paraguai.',
        'Sou mais larga e mais alta do que as famosas cataratas do Niágara.',
        'Uma das minhas partes, em forma de U, é chamada Garganta do Diabo.',
        'Passarelas permitem chegar bem perto da queda d\'água.',
        'Em 1984, virei Patrimônio Natural da Humanidade da UNESCO.',
        'Em 2011, fui eleita uma das Sete Maravilhas Naturais do Mundo.',
        'No lado brasileiro, fica a cidade de Foz.',
        'No lado argentino, fica a província de Misiones.',
        'Meu parque nacional guarda uma das últimas grandes áreas de Mata Atlântica.',
        'Fico no estado do Paraná.',
        'Sou um cartão-postal do sul do Brasil.',
        'Meu rio tem o mesmo nome que eu.',
        'Sou as Cataratas do ...'
      ]
    },
    {
      id: 'pao-acucar', cat: 'lugar', answer: 'Pão de Açúcar', aliases: ['Pão de Açúcar', 'Pao de Acucar', 'Morro do Pão de Açúcar'],
      clues: [
        'Sou uma rocha gigante que sobe quase em linha reta.',
        'Fico numa cidade litorânea famosa no mundo todo.',
        'Sou feito de granito e quartzo.',
        'Tenho cerca de 400 metros de altura.',
        'Meu nome lembra o formato em que um alimento doce era vendido antigamente.',
        'Esse alimento era moldado num cone parecido comigo.',
        'Alguns dizem que meu nome vem de uma palavra indígena que significa "morro alto e pontudo".',
        'Fico na entrada de uma baía famosa.',
        'Perto de mim, uma praia tem areia de tom avermelhado: a Praia Vermelha.',
        'Escaladores gostam de subir minhas paredes.',
        'Uma estação intermediária fica no morro vizinho, o Morro da Urca.',
        'Meu bondinho foi inaugurado em 1912.',
        'Foi o primeiro teleférico do Brasil e um dos primeiros do mundo.',
        'A subida é feita em duas etapas, em cabines envidraçadas.',
        'Apareci num filme do agente 007, "Moonraker".',
        'Daqui se vê o Cristo Redentor ao longe.',
        'Fico no bairro da Urca.',
        'Sou um dos cartões-postais mais famosos do Rio de Janeiro.',
        'O pôr do sol visto do meu topo é famoso.',
        'Meu nome é o de um doce em formato de cone: Pão de ...'
      ]
    },

    // ===================== COISA =====================
    {
      id: 'lampada', cat: 'coisa', answer: 'Lâmpada', aliases: ['Lâmpada', 'Lampada', 'Lâmpada elétrica', 'Lampada eletrica'],
      clues: [
        'Sou um objeto de uso diário nas casas do mundo todo.',
        'Antes de mim, as noites eram iluminadas por velas e lampiões.',
        'Funciono com eletricidade.',
        'Sou feita de vidro, com uma peça de rosca na ponta.',
        'Dizem que Thomas Edison me inventou, mas outros inventores também trabalharam em mim.',
        'Em 1879, uma versão minha ficou acesa por mais de 13 horas num teste.',
        'Dentro de mim há um filamento muito fino.',
        'Quando a corrente passa por ele, o filamento esquenta e brilha.',
        'Dentro do vidro há vácuo ou um gás especial, para o filamento não queimar.',
        'Uma versão minha ainda funciona numa cidade da Califórnia desde 1901.',
        'Minhas primeiras versões usavam filamento de carbono; depois vieram os de tungstênio.',
        'Eu perdia muita energia na forma de calor.',
        'Hoje, versões fluorescentes e de LED me substituem.',
        'Os desenhos animados me usam para mostrar que alguém teve uma boa ideia.',
        'Um interruptor liga e desliga o meu brilho.',
        'Posso queimar e ter que ser trocada.',
        'Quando o filamento se rompe, dizem que eu "queimei".',
        'Ilumino ambientes.',
        'Pendurada no teto, dou luz ao cômodo.',
        'Meu nome vem de "lâmpada", a mesma palavra que me nomeia: sou a ...'
      ]
    },
    {
      id: 'bicicleta', cat: 'coisa', answer: 'Bicicleta', aliases: ['Bicicleta', 'Bike', 'Bici', 'Magrela', 'Velocípede'],
      clues: [
        'Preciso de força humana para funcionar, não de combustível.',
        'Não poluo o ar.',
        'Meu primeiro ancestral surgiu em 1817, na Alemanha, e não tinha pedais.',
        'Quem me usava ia empurrando o chão com os pés.',
        'Os pedais só apareceram nas minhas versões da década de 1860.',
        'Tive uma versão com uma roda enorme na frente e uma minúscula atrás.',
        'No final do século XIX, ganhei uma corrente ligando os pedais à roda traseira.',
        'Em 1888, passei a usar pneus de borracha cheios de ar.',
        'Tenho duas rodas alinhadas.',
        'Fico em pé quando estou em movimento, graças ao equilíbrio de quem me conduz.',
        'Tenho um guidão, um selim e uma estrutura chamada quadro.',
        'Para parar, uso freios nas rodas.',
        'Posso ter marchas para subir ladeiras.',
        'Em países como Holanda e Dinamarca, sou muito popular.',
        'Uma corrida famosa na França, a Volta da França, é disputada sobre mim.',
        'Crianças aprendem a me usar com rodinhas laterais.',
        'Tenho uma campainha para avisar quem está na frente.',
        'Em inglês, tenho um apelido de quatro letras: "bike".',
        'Sou um veículo de duas rodas movido a pedal.',
        'Meu nome começa com B e termina com A.'
      ]
    },
    {
      id: 'relogio', cat: 'coisa', answer: 'Relógio', aliases: ['Relógio', 'Relogio', 'Relógio de pulso', 'Relógio de parede'],
      clues: [
        'Sou um objeto muito antigo, mas ainda indispensável hoje.',
        'Existo para medir uma coisa que ninguém consegue segurar.',
        'Meus ancestrais usavam a sombra do Sol para me marcar.',
        'Outros ancestrais usavam água pingando em recipientes.',
        'Na Idade Média, surgiram versões mecânicas, com engrenagens e pesos.',
        'Elas ficavam em torres de igrejas e prefeituras.',
        'Em 1656, um holandês chamado Huygens usou um pêndulo para me deixar muito mais preciso.',
        'Depois fiquei pequeno o bastante para caber no bolso.',
        'Em 1904, um joalheiro francês criou uma versão de pulso para um aviador brasileiro.',
        'A versão de pulso se tornou muito popular depois das guerras mundiais.',
        'Hoje, muitas versões usam um pequeno cristal de quartzo que vibra.',
        'Os mais precisos usam átomos para medir.',
        'Tenho ponteiros: um para as horas, outro para os minutos e, às vezes, um para os segundos.',
        'Ou posso mostrar números num visor.',
        'Meu mostrador costuma ter 12 marcas.',
        'Uma hora tem 60 minutos por causa de um sistema numérico dos babilônios.',
        'Alarmes me acompanham para acordar você.',
        'Meu tique-taque é famoso.',
        'Dizem que "tempo é dinheiro", e eu sou quem conta.',
        'Meu nome começa com R e termina com O.'
      ]
    },
    {
      id: 'camera', cat: 'coisa', answer: 'Câmera fotográfica', aliases: ['Câmera fotográfica', 'Camera fotografica', 'Câmera', 'Camera', 'Máquina fotográfica', 'Maquina fotografica', 'Máquina de fotografar', 'Câmara fotográfica'],
      clues: [
        'Registro momentos para que nunca sejam esquecidos.',
        'Meu princípio é conhecido há mais de mil anos: uma sala escura com um furinho.',
        'Na época, a imagem aparecia de cabeça para baixo na parede.',
        'Em 1826, um francês chamado Niépce fez a primeira imagem permanente.',
        'Ele precisou deixar a placa exposta durante muitas horas.',
        'Em 1839, o daguerreótipo tornou o processo mais rápido.',
        'Em 1888, a Kodak lançou uma versão simples com o slogan "você aperta o botão, nós fazemos o resto".',
        'Eu usava um rolo de filme.',
        'Era preciso revelar o filme num laboratório escuro.',
        'Em 1948, uma versão minha passou a mostrar a foto na hora.',
        'Em 1975, um engenheiro da Kodak montou a minha primeira versão digital.',
        'Ela pesava cerca de 3 quilos e gravava as imagens numa fita.',
        'Hoje, minha versão digital cabe dentro de um telefone.',
        'Tenho uma lente que concentra a luz.',
        'Tenho um obturador, que abre e fecha rapidamente.',
        'Posso ter flash para iluminar cenas escuras.',
        'Antes de me usar, o fotógrafo pede: "digam xis!"',
        'Meu clique é um som muito conhecido.',
        'Sou companheira de turistas e de repórteres.',
        'Sou a máquina de tirar fotografias.'
      ]
    },

    // ===================== ANO =====================
    {
      id: 'ano-1492', cat: 'ano', answer: '1492', aliases: ['1492'],
      clues: [
        'Neste ano, a Europa ainda não sabia que havia outro continente do outro lado do Atlântico.',
        'Os turcos otomanos controlavam as rotas comerciais por terra para o Oriente.',
        'Portugal e Espanha disputavam novos caminhos para as Índias.',
        'Em janeiro, a cidade de Granada se rendeu aos reis católicos.',
        'Terminava a presença muçulmana na Península Ibérica, depois de quase oito séculos.',
        'Pouco depois, os judeus que não se convertessem foram expulsos da Espanha.',
        'Um navegador italiano convenceu a rainha Isabel de Castela a financiá-lo.',
        'Ele prometia chegar ao Oriente navegando para o Ocidente.',
        'Partiu do porto de Palos com três navios.',
        'Os navios se chamavam Santa María, Pinta e Niña.',
        'Depois de mais de dois meses no mar, um marinheiro gritou "Terra!".',
        'Era o dia 12 de outubro.',
        'Desembarcaram numa ilha das Bahamas, que os nativos chamavam Guanahani.',
        'O navegador achou que tinha chegado às Índias e chamou os nativos de "índios".',
        'Foi o início da colonização europeia da América.',
        'O navegador se chamava Cristóvão Colombo.',
        'Oito anos depois, os portugueses chegariam ao Brasil.',
        'Neste ano também foi publicada a primeira gramática da língua espanhola.',
        'Fico entre 1491 e 1493.',
        'Sou o ano em que Colombo chegou à América.'
      ]
    },
    {
      id: 'ano-1889', cat: 'ano', answer: '1889', aliases: ['1889'],
      clues: [
        'No ano anterior, a escravidão tinha sido abolida no Brasil.',
        'Os fazendeiros, descontentes, apoiavam cada vez menos o imperador.',
        'O Exército, que lutara na Guerra do Paraguai, também estava insatisfeito com o governo.',
        'Crescia um movimento que defendia a república.',
        'O imperador, D. Pedro II, estava velho e doente.',
        'Na França, uma grande exposição universal comemorava os cem anos da Revolução.',
        'Para essa feira, foi inaugurada uma torre de ferro em Paris.',
        'No Brasil, em novembro, um marechal comandou tropas no Rio de Janeiro.',
        'Ele se chamava Deodoro da Fonseca.',
        'Não houve batalhas: foi um golpe quase sem sangue.',
        'O Brasil deixou de ser um império.',
        'O imperador e sua família foram mandados para a Europa.',
        'Foi em 15 de novembro.',
        'Nascia a República dos Estados Unidos do Brasil.',
        'A bandeira do Império foi trocada.',
        'A nova bandeira trouxe o lema "Ordem e Progresso".',
        'Hoje, o dia 15 de novembro é feriado nacional.',
        'Depois de quase 67 anos, o Império do Brasil chegava ao fim.',
        'Faltava apenas um ano para a década de 1890.',
        'Sou o ano da Proclamação da República.'
      ]
    },
    {
      id: 'ano-1914', cat: 'ano', answer: '1914', aliases: ['1914'],
      clues: [
        'No começo deste ano, o industrial Henry Ford passou a pagar cinco dólares por dia aos operários.',
        'A Europa vivia uma paz aparente, cheia de rivalidades entre impérios.',
        'Os países estavam divididos em alianças militares.',
        'Havia uma corrida para ter os maiores exércitos e navios.',
        'Num domingo de junho, o herdeiro do trono austro-húngaro visitava uma cidade dos Bálcãs.',
        'A cidade era Sarajevo.',
        'Um jovem nacionalista sérvio chamado Gavrilo Princip o assassinou.',
        'O morto era o arquiduque Francisco Ferdinando.',
        'Um mês depois, o Império Austro-Húngaro declarou guerra à Sérvia.',
        'As alianças arrastaram a Rússia, a Alemanha, a França e a Grã-Bretanha.',
        'A Alemanha invadiu a Bélgica a caminho da França.',
        'Em agosto, foi inaugurado o Canal do Panamá.',
        'Os soldados achavam que voltariam para casa antes do Natal.',
        'Cavaram trincheiras ao longo de centenas de quilômetros.',
        'Na véspera de Natal, soldados inimigos pararam de lutar e trocaram presentes na terra de ninguém.',
        'Era o primeiro grande conflito industrial do mundo, com metralhadoras e artilharia pesada.',
        'Chamaram-na de "a guerra para acabar com todas as guerras".',
        'Mais tarde, ela passaria a ser chamada de Primeira Guerra Mundial.',
        'Terminaria em 1918.',
        'Sou o ano em que começou a Primeira Guerra Mundial.'
      ]
    },
    {
      id: 'ano-1989', cat: 'ano', answer: '1989', aliases: ['1989'],
      clues: [
        'Neste ano, o mundo ainda estava dividido entre dois blocos: o capitalista e o comunista.',
        'O imperador do Japão, Hirohito, morreu em janeiro.',
        'Em março, um petroleiro encalhou no Alasca e derramou milhões de litros de óleo no mar.',
        'Também em março, um cientista do CERN propôs um sistema para ligar documentos na internet.',
        'Nascia a ideia da World Wide Web.',
        'Em abril, a Nintendo lançou um videogame portátil cinza que viraria febre.',
        'Em junho, estudantes protestaram em Pequim, na Praça da Paz Celestial.',
        'O governo chinês reprimiu os protestos.',
        'Na Europa Oriental, vários governos comunistas caíram, quase sem violência.',
        'Na Hungria, a fronteira com a Áustria foi aberta.',
        'No Brasil, o povo votou para presidente pela primeira vez em quase 30 anos.',
        'O vencedor foi Fernando Collor de Mello.',
        'Em novembro, milhares de alemães orientais foram até a fronteira.',
        'Em 9 de novembro, as autoridades anunciaram que todos poderiam atravessá-la.',
        'Multidões subiram num muro que dividia uma cidade ao meio.',
        'Esse muro separava Berlim Oriental de Berlim Ocidental.',
        'Pouco depois, começou a ser derrubado a marretadas.',
        'Dois anos depois, a União Soviética deixaria de existir.',
        'Foi o último ano da década de 1980.',
        'Sou o ano da queda do Muro de Berlim.'
      ]
    }
  );

  // dificuldade (1 fácil · 2 média · 3 difícil)
  const D = { 'santos-dumont': 2, pele: 1, einstein: 1, 'da-vinci': 1, senna: 1, cleopatra: 2, cristo: 1, eiffel: 1, 'machu-picchu': 2, amazonia: 1, muralha: 1, antartida: 2, bussola: 2, 'guarda-chuva': 1, espelho: 1, geladeira: 2, violao: 1, oculos: 2,
    'ano-1500': 1, 'ano-1789': 2, 'ano-1822': 1, 'ano-1888': 2, 'ano-1945': 2, 'ano-1969': 2,
    'marie-curie': 2, tiradentes: 1, machado: 2, newton: 1, piramides: 1, coliseu: 1, iguacu: 1, 'pao-acucar': 1, lampada: 1, bicicleta: 1, relogio: 1, camera: 2,
    'ano-1492': 1, 'ano-1889': 2, 'ano-1914': 2, 'ano-1989': 3 };
  C.forEach(c => { c.d = D[c.id] || 2; });
})();
