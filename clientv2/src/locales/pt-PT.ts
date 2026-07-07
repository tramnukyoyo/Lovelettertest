/**
 * European Portuguese Translations
 * Bluffalo - Escreve mentiras convincentes e engana os teus amigos!
 */

import type { Translations } from './en';

export const ptPT: Translations = {
  // Lobby explainer (animated demo)
  explainer: {
    bluffalo: {
      beat1: 'Uma pergunta de trivia obscura aparece.',
      beat2: 'Cada jogador escreve uma mentira credivel.',
      beat3: 'A resposta real e baralhada com as mentiras.',
      beat4: 'Votem em qual e a verdadeira.',
      beat5: 'Pontos por encontrar a verdade — e por enganar os outros.',
    },
  },

  // Common
  common: {
    loading: 'A carregar...',
    error: 'Erro',
    close: 'Fechar',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    yes: 'Sim',
    no: 'Nao',
    ok: 'OK',
    back: 'Voltar',
    next: 'Seguinte',
    start: 'Iniciar',
    stop: 'Parar',
    retry: 'Tentar novamente',
  },

  // Homepage
  home: {
    title: 'Bluffalo',
    createRoom: 'Criar Sala',
    joinRoom: 'Entrar na Sala',
    yourName: 'O Teu Nome',
    roomCode: 'Codigo da Sala',
    enterName: 'Introduz o teu nome',
    enterRoomCode: 'Introduz o codigo da sala',
    create: 'Criar',
    join: 'Entrar',
    createDescription: 'Comeca um novo jogo e convida amigos',
    joinDescription: 'Entra numa sala existente com um codigo',
    streamerMode: 'Modo Streamer (ocultar codigo)',
    streamerModeHint: 'Ocultar codigo da sala para transmissao',
    bigScreenMode: 'Modo Ecra Grande (TV — jogadores pelo telemovel)',
    startBigScreen: 'Iniciar Ecra Grande',
    howToPlay: 'Como Jogar',
    tip: 'Dica: Partilha o codigo da sala com amigos para jogarem juntos!',
    multiplayerTip: 'Este e um jogo multiplayer — chama os teus amigos e joguem juntos!',
    gameBuddiesBanner: 'A jogar via GameBuddies.io',
    multiplayerBadge: '{min}-{max} jogadores',
    step1Title: 'Criar uma Sala',
    step2Title: 'Partilhar a Ligacao',
    step3Title: 'Jogar Juntos',
    inviteFirst: 'Convidar amigos primeiro?',
    copyLink: 'Copiar Ligacao',
    linkCopied: 'Copiado!',
    whatsapp: 'WhatsApp',
    share: 'Partilhar',
    whatsappText: 'Vamos jogar {game}! {url}',
  },

  // Lobby
  lobby: {
    title: 'Sala de Espera',
    waitingForPlayers: 'A aguardar jogadores...',
    players: 'Jogadores',
    chat: 'Chat',
    settings: 'Definicoes',
    startGame: 'Iniciar Jogo',
    leaveRoom: 'Sair da Sala',
    copyLink: 'Copiar Ligacao',
    linkCopied: 'Ligacao copiada!',
    host: 'Anfitriao',
    you: 'Tu',
    minPlayersRequired: 'Minimo de {min} jogadores necessarios',
    shareCode: 'Partilhar Codigo',
    waitingForHost: 'A aguardar que o anfitriao inicie...',
    inviteTitle: 'Convida os Teus Amigos',
    copyInviteLink: 'Copiar Ligacao de Convite',
    scanToJoin: 'Digitaliza para entrar em qualquer telemovel',
    needMorePlayers: 'Precisa de mais {count} jogador(es)',
    shareToInvite: 'Partilha a ligacao para que os teus amigos entrem!',
  },

  // Header
  header: {
    room: 'Sala:',
    tryAnotherGame: 'Outro jogo',
    tryAnotherGameTitle: 'Voltar ao GameBuddies.io para escolher outro jogo',
    streamerMode: 'Modo Streamer',
    copyRoomLink: 'Copiar ligacao da sala',
    copyInviteLink: 'Copiar ligacao de convite',
  },

  // Video
  video: {
    joinVideo: 'Entrar no video',
    settingUp: 'A configurar...',
    leaveVideo: 'Sair do video chat',
    modal: {
      // Tabs
      tabDevices: 'Dispositivos',
      tabBackground: 'Fundo',
      tabAudio: 'Áudio',
      tabAvatar: 'Avatar',
      // Titles
      titleSetup: 'Entrar no videochat',
      titleEdit: 'Definições de vídeo',
      titleSetupMobile: 'Configurar câmara',
      titleEditMobile: 'Definições da câmara',
      // Preview overlays
      cameraOff: 'Câmara desligada',
      loadingVirtualBg: 'A carregar fundo virtual...',
      virtualBgActive: 'Fundo virtual ativo',
      // Devices tab
      camera: 'Câmara',
      microphone: 'Microfone',
      noCameras: 'Nenhuma câmara encontrada',
      noMicrophones: 'Nenhum microfone encontrado',
      cameraFallback: 'Câmara {id}',
      microphoneFallback: 'Microfone {id}',
      audioLevel: 'Nível de áudio',
      joinMuted: 'Entrar sem som',
      joinCameraOff: 'Entrar com a câmara desligada',
      // Background tab
      vbBrowserWarning: 'Os fundos virtuais requerem Chrome 108+ ou um navegador com suporte a Insertable Streams.',
      enableVirtualBg: 'Ativar fundo virtual',
      blur: 'Desfoque',
      vbInfo: 'Os fundos virtuais usam segmentação por IA para substituir o teu fundo em tempo real.',
      // Audio tab
      aiNoiseSuppression: 'Supressão de ruído por IA',
      noiseThreshold: 'Limite de ruído',
      sensitive: 'Sensível',
      aggressive: 'Agressivo',
      noiseInfo: 'Reduz ruídos de fundo como teclado, ventoinhas e sons ambientes durante o videochat.',
      pushToTalk: 'Premir para falar',
      pushToTalkInfo: 'O teu microfone fica silenciado até manteres a barra de espaço premida para falar.',
      // Avatar tab
      faceAvatar: 'Avatar facial 3D',
      avatarRaccoon: 'Guaxinim',
      avatarMetaHuman: 'Humano',
      avatarRobot: 'Robô',
      avatarAlien: 'Alien',
      avatarCat: 'Gato',
      soon: 'Em breve',
      avatarInfo: 'Os teus movimentos faciais controlam um avatar 3D através de seguimento facial por IA. O teu rosto real nunca é mostrado.',
      // Actions
      joinVideoChat: 'Entrar no videochat',
      saveSettings: 'Guardar definições',
    },
  },

  // Game
  game: {
    round: 'Ronda',
    score: 'Pontuacao',
    yourTurn: 'A Tua Vez',
    waitingForOthers: 'A aguardar outros jogadores...',
    gameOver: 'Fim de Jogo!',
    winner: 'Vencedor',
    playAgain: 'Jogar de Novo',
    returnToLobby: 'Voltar ao Lobby',
  },

  // Big Screen (TV / PC / Discord stream mode)
  bigScreen: {
    branding: 'Ecra Grande · GameBuddies.io',
    joinTheGame: 'Entrar no jogo',
    roomCode: 'Codigo da sala',
    qrAlt: 'Codigo QR para entrar na sala {code}',
    scanWithPhone: 'Digitaliza com o telemovel',
    playersCount: 'Jogadores ({count}/{max})',
    needMoreToStart: 'Faltam {count} para comecar',
    readyToStart: 'Pronto para comecar',
    waitingForPlayersToJoin: 'A aguardar que entrem jogadores…',
    startGame: 'Iniciar jogo',
    waitingForMorePlayers: 'A aguardar mais {count} jogador(es)…',
    bluffsIn: '{count} de {total} mentira(s) enviada(s)',
    voteBadge: 'Votacao · Ronda {round}/{total}',
    votedCount: '{count} / {total} votaram',
    continueReady: 'Continuar · {count} / {total} prontos',
    byAuthor: 'por {name}',
    noVotes: 'Sem votos',
    nextRoundReady: 'Proxima ronda · {count} / {total} prontos',
    thisRound: 'Esta ronda',
    foundTruth: 'Encontrou a verdade',
    fooledVoter: 'Enganou {name}',
    selfVote: 'Votou na propria mentira',
    gameOverBadge: 'Fim do jogo',
    playAgainReady: 'Jogar de novo · {count} / {total} prontos',
    champion: 'Campeao',
    points: '{n} pts',
    liesFooledTooltip: 'Mentiras que enganaram alguem',
    correctGuessesTooltip: 'Acertos',
  },

  // Bluffalo-specific
  bluffalo: {
    // Phases
    getReady: 'Prepara-te...',
    roundOf: 'Ronda {current} de {total}',
    // Lie input
    writeYourLie: 'Escreve a tua mentira!',
    liePlaceholder: 'Escreve uma resposta falsa convincente...',
    submitLie: 'Enviar Mentira',
    lieSubmitted: 'Mentira enviada!',
    waitingForLies: 'A aguardar que os outros escrevam as mentiras...',
    liesSubmitted: '{count}/{total} enviadas',
    charCount: '{count}/{max}',
    // Voting
    whichIsReal: 'Qual resposta e a verdadeira?',
    castYourVote: 'Vota Agora',
    voteSubmitted: 'Voto registado!',
    waitingForVotes: 'A aguardar votos...',
    votesSubmitted: '{count}/{total} votaram',
    // Reveal
    theAnswerIs: 'A resposta e...',
    correctAnswer: 'Correto!',
    fooledBy: 'Escrita por {name}',
    nobodyFooled: 'Ninguem foi enganado!',
    youFoundTruth: 'Encontraste a verdade!',
    youWereFooled: 'Foste enganado!',
    youDidNotVote: 'Nao votaste.',
    pointsEarned: '+{points}',
    // Score event reasons (server sends structured keys; client translates)
    scoreFoundTruth: 'Encontraste a verdade!',
    scoreFooled: 'Enganaste {name}!',
    scoreSelfVote: 'Votaste na tua propria mentira!',
    // Scores
    roundScores: 'Pontuacao da Ronda',
    nextRound: 'Proxima Ronda',
    // Game over
    finalStandings: 'Classificacao Final',
    champion: 'Campeao!',
    liesFooled: 'Mentiras que Enganaram',
    correctGuesses: 'Respostas Corretas',
    timesDeceived: 'Vezes Enganado',
    totalScore: 'Pontuacao Total',
    // Host settings
    hostSettings: 'Definicoes do Jogo',
    rounds: 'Rondas',
    lieTime: 'Tempo para Mentir',
    voteTime: 'Tempo para Votar',
    revealTime: 'Tempo de Revelacao',
    category: 'Categoria',
    pointsCorrect: 'Pontos por Acerto',
    pointsPerFool: 'Pontos por Engano',
    seconds: '{n}s',
    lowQuestionWarning: 'Apenas {count} perguntas disponiveis neste idioma - as rondas adicionais serao em ingles.',
    // Categories
    catHistory: 'Historia',
    catScience: 'Ciencia',
    catGeography: 'Geografia',
    catEntertainment: 'Entretenimento',
    catSports: 'Desporto',
    catFood: 'Comida e Bebida',
    catWeird: 'Factos Estranhos',
    catRandom: 'Aleatorio (Todos)',
    // Errors
    lieTooSimilar: 'A tua resposta e muito parecida com a verdadeira!',
    lieDuplicate: 'Alguem ja enviou essa resposta!',
    yourLie: 'A tua mentira',
    pts: 'pts',
  },

  // QR scan-to-join
  scanQr: {
    button: 'Ler QR',
    hint: 'Aponta a câmara para o código QR na TV',
    starting: 'A iniciar a câmara…',
    permissionDenied: 'Câmara indisponível — tira uma foto do código QR',
    cameraError: 'A câmara parou — tira uma foto do código QR',
    photoButton: 'Tirar uma foto do código QR',
    photoProcessing: 'A ler a foto…',
    photoFailed: 'Nenhum código QR encontrado — aproxima-te do ecrã e tenta novamente',
    photoUnreadable: 'Não foi possível ler a foto — tira outra',
    libraryButton: 'Escolher das Fotos',
    joinTitle: 'Código lido!',
    joinSubtitle: 'Escreve o teu nome para entrar na sala {code}',
    joinCta: 'Entrar no jogo',
    notACode: 'Não é um código GameBuddies',
    close: 'Fechar leitor',
  },

  // Chat
  chat: {
    typeMessage: 'Escreve uma mensagem...',
    send: 'Enviar',
    noMessages: 'Ainda sem mensagens',
    // AI-TRANSLATED on 2026-05-19, please review
    title: 'Chat',
    sayHello: 'Diz ola aos teus colegas!',
    slowDown: 'Mais devagar...',
    openFull: 'Abrir chat completo',
    closeChat: 'Fechar chat',
    sendMessage: 'Enviar mensagem',
  },

  // Kick toast
  // AI-TRANSLATED on 2026-05-19, please review
  kickToast: {
    title: 'Expulso da sala',
    close: 'Fechar notificacao',
  },

  // Error boundary
  // AI-TRANSLATED on 2026-05-19, please review
  errorBoundary: {
    title: 'Algo correu mal',
    message: 'Lamentamos, mas algo inesperado aconteceu.',
    refresh: 'Recarregar pagina',
    goHome: 'Ir para o inicio',
  },

  // Spectator banner
  // AI-TRANSLATED on 2026-05-19, please review
  spectator: {
    viewingAs: 'A ver como {name}',
    spectating: 'Estas como espectador — clica num jogador para veres a vista dele',
    resetView: 'Repor vista',
    badge: 'Espectador',
  },

  // Player list
  // AI-TRANSLATED on 2026-05-19, please review
  playerList: {
    kick: 'Expulsar',
    confirmKick: 'Confirmar expulsao',
    cancel: 'Cancelar',
    kickPlayer: 'Expulsar jogador',
    premium: 'Premium',
    pro: 'Pro',
  },

  // Streamer broadcast stage
  // AI-TRANSLATED on 2026-05-19, please review
  streamerStage: {
    waitingForPlayers: 'A aguardar jogadores...',
    playersInLobby: '{count} jogador(es) no lobby',
    gameInProgress: 'Jogo a decorrer',
    playersLabel: '{count} jogadores',
    gameOver: 'Fim de Jogo!',
    thanksForWatching: 'Obrigado por assistir',
    phaseWaiting: 'A AGUARDAR',
    phasePlaying: 'A JOGAR',
    phaseEnded: 'FIM DE JOGO',
    resizeTiles: 'Arrasta para redimensionar',
  },

  // Video controls
  // AI-TRANSLATED on 2026-05-19, please review
  videoControl: {
    expandVideos: 'Expandir videos',
    collapseVideos: 'Fechar videos',
    videosLabel: 'Videos',
    cameraOn: 'Ligar camara',
    cameraOff: 'Desligar camara',
    unmuteMic: 'Ativar microfone',
    muteMic: 'Silenciar microfone',
    videoSettings: 'Definicoes de video',
    showVideos: 'Clica para mostrar videos',
    resizeHint: 'Arrasta para redimensionar, duplo clique para fechar',
    noFeeds: 'Sem videos disponiveis',
    yourTurn: 'A Tua Vez',
    connecting: 'A ligar…',
    reactions: 'Reações',
    pttLive: 'Em direto',
  },

  // Video enhancements panel
  // AI-TRANSLATED on 2026-05-19, please review
  videoEnhancements: {
    virtualBackground: 'Fundo Virtual',
    faceAvatar: 'Avatar Facial',
    noiseSuppression: 'Supressao de Ruido',
    on: 'Ligado',
    off: 'Desligado',
    none: 'Nenhum',
    blur: 'Desfoque',
  },

  // Mobile menus
  // AI-TRANSLATED on 2026-05-19, please review
  menus: {
    openMenu: 'Abrir menu',
    closeMenu: 'Fechar menu',
    menuTitle: 'Menu',
  },

  // Mobile hamburger menu items + drawer titles
  // AI-TRANSLATED on 2026-06-12, please review
  menu: {
    tapToCopy: 'Toca para copiar',
    linkCopied: 'Ligação copiada!',
    streamerMode: 'Modo Streamer',
    chat: 'Chat',
    newMessages: '{count} mensagens novas',
    openChat: 'Abrir chat',
    players: 'Jogadores',
    videoChat: 'Videochat',
    videoOn: 'Vídeo ligado',
    videoOff: 'Vídeo desligado',
    tapToToggle: 'Toca para alternar',
    soundSettings: 'Definições de som',
    howToPlay: 'Como jogar',
    settings: 'Definições',
    returnToLobby: 'Voltar ao lobby',
    resetForAll: 'Repor para todos',
    returnToGameBuddies: 'Voltar ao GameBuddies',
    backToLobby: 'Voltar ao lobby',
    leaveRoom: 'Sair da sala',
  },

  // Game explainer modal
  // AI-TRANSLATED on 2026-05-19, please review
  gameExplainer: {
    closeHowToPlay: 'Fechar instrucoes',
    tapForFullGuide: 'Toca para o guia completo',
  },

  // Bluffalo big-screen-only labels
  // AI-TRANSLATED on 2026-05-19, please review
  bluffaloBigScreen: {
    playersVoteContinue: 'Os jogadores votam para continuar…',
    playersVoteAgain: 'Os jogadores votam para jogar de novo…',
    countdownGo: 'JA!',
  },

  // In-game feedback / bug report modal
  feedback: {
    menuLabel: 'Reportar um problema',
    title: 'Reportar um problema',
    intro: 'Encontrou um erro ou tem uma ideia? Diga-nos — lemos todos os relatos.',
    typeBug: 'Erro',
    typeIdea: 'Ideia',
    typeOther: 'Outro',
    messagePlaceholder: 'O que aconteceu? Quantos mais detalhes, melhor.',
    roomLabel: 'Sala',
    stateAttachedNote: 'O estado atual do seu jogo é anexado para nos ajudar a depurar.',
    submit: 'Enviar relato',
    sending: 'A enviar…',
    successTitle: 'Obrigado pelo relato!',
    successBody: 'Foi diretamente para a equipa da GameBuddies.',
    errorMsg: 'Não foi possível enviar o seu relato. Tente novamente.',
    tooShort: 'Acrescente um pouco mais de detalhe, por favor.',
  },

  // Settings
  settings: {
    title: 'Definicoes',
    general: 'Geral',
    theme: 'Tema',
    themeDark: 'Escuro',
    themeLight: 'Claro',
    audio: 'Audio',
    video: 'Video',
    language: 'Idioma',
    music: 'Musica',
    soundEffects: 'Efeitos Sonoros',
    backgroundMusic: 'Musica de Fundo',
    volume: 'Volume',
    camera: 'Camara',
    microphone: 'Microfone',
    virtualBackground: 'Fundo Virtual',
    videoDescription: 'Configura as definicoes de camara e microfone.',
  },

  // Invite Modal
  invite: {
    title: 'Foste convidado!',
    subtitle: 'Introduz o teu nome para entrar no jogo',
    joinGame: 'Entrar no Jogo',
  },

  // Errors
  errors: {
    connectionLost: 'Ligacao perdida',
    roomNotFound: 'Sala nao encontrada',
    roomFull: 'Sala cheia',
    invalidName: 'Por favor, introduz um nome valido',
    invalidRoomCode: 'Por favor, introduz um codigo de sala valido',
  },

  // Reconnect Overlay
  reconnect: {
    title: 'Jogo restaurado',
    playersReconnected: '{connected}/{total} reconectados',
    resumeGame: 'Continuar jogo',
    waitingForHost: 'A aguardar o anfitriao continuar...',
  },
  homeMenu: {
    howToPlay: 'Como jogar',
    learnTheRules: 'Aprende as regras',
    soundAndPreferences: 'Som e preferências',
  },

  // Platform profile peek card (gb:player:profile)
  playerCard: {
    level: 'Nível {level}',
    gabuPoints: 'GabuPoints',
    dailyStreak: 'Sequência diária',
    winsInGame: 'Vitórias neste jogo',
    achievements: 'Conquistas ({count})',
  },

  // Lobby invite panel (GameBuddies friends + QR)
  invitePanel: {
    friendsTitle: 'Convidar amigos',
    invite: 'Convidar',
    sent: 'Enviado!',
    failed: 'Falhou',
    qr: 'Código QR',
  },
};
