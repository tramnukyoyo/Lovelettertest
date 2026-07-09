/**
 * Spanish (Latin American) Translations
 */

import type { Translations } from './en';

export const es: Translations = {
  // Lobby explainer (animated demo)
  explainer: {
    bluffalo: {
      beat1: 'Aparece una pregunta de trivia poco conocida.',
      beat2: 'Cada jugador escribe una mentira creible.',
      beat3: 'La respuesta real se mezcla con las mentiras.',
      beat4: 'Voten cual creen que es la verdadera.',
      beat5: 'Puntos por acertar la verdad — y por enganar a otros.',
    },
  },

  // Common
  common: {
    loading: 'Cargando...',
    error: 'Error',
    close: 'Cerrar',
    save: 'Guardar',
    cancel: 'Cancelar',
    confirm: 'Confirmar',
    yes: 'Si',
    no: 'No',
    ok: 'OK',
    back: 'Volver',
    next: 'Siguiente',
    start: 'Iniciar',
    stop: 'Detener',
    retry: 'Reintentar',
  },

  // Homepage
  home: {
    title: 'Bluffalo',
    createRoom: 'Crear sala',
    joinRoom: 'Unirse a sala',
    yourName: 'Tu nombre',
    roomCode: 'Codigo de sala',
    enterName: 'Ingresa tu nombre',
    enterRoomCode: 'Ingresa el codigo de sala',
    create: 'Crear',
    join: 'Unirse',
    createDescription: 'Inicia un nuevo juego e invita a tus amigos',
    joinDescription: 'Unete a una sala existente con un codigo',
    streamerMode: 'Modo streamer (ocultar codigo de sala)',
    streamerModeHint: 'Ocultar codigo de sala para streaming',
    bigScreenMode: 'Modo Pantalla Grande (TV — jugadores desde sus moviles)',
    startBigScreen: 'Iniciar Pantalla Grande',
    howToPlay: 'Como jugar',
    tip: 'Consejo: Comparte tu codigo de sala con amigos para jugar juntos!',
    multiplayerTip: 'Este es un juego multijugador — junta a tus amigos y jueguen juntos!',
    gameBuddiesBanner: 'Jugando a traves de GameBuddies.io',
    multiplayerBadge: '{min}-{max} jugadores',
    step1Title: 'Crea una sala',
    step2Title: 'Comparte el enlace',
    step3Title: 'Jueguen juntos',
    inviteFirst: 'Invitar amigos primero?',
    copyLink: 'Copiar enlace',
    linkCopied: 'Copiado!',
    whatsapp: 'WhatsApp',
    share: 'Compartir',
    whatsappText: "Vamos a jugar {game}! {url}",
  },

  // Lobby
  lobby: {
    title: 'Sala de Espera',
    waitingForPlayers: 'Esperando jugadores...',
    players: 'Jugadores',
    chat: 'Chat',
    settings: 'Configuracion',
    startGame: 'Iniciar juego',
    leaveRoom: 'Salir de la sala',
    copyLink: 'Copiar enlace',
    linkCopied: 'Enlace copiado!',
    host: 'Anfitrion',
    you: 'Tu',
    minPlayersRequired: 'Se requieren minimo {min} jugadores',
    shareCode: 'Compartir codigo',
    waitingForHost: 'Esperando a que el anfitrion inicie...',
    inviteTitle: 'Invita a tus amigos',
    copyInviteLink: 'Copiar enlace de invitacion',
    scanToJoin: 'Escanea para unirte desde cualquier celular',
    needMorePlayers: 'Se necesitan {count} jugador(es) mas',
    shareToInvite: 'Comparte el enlace para que tus amigos se unan!',
  },

  // Header
  header: {
    room: 'Sala:',
    tryAnotherGame: 'Otro juego',
    tryAnotherGameTitle: 'Volver a GameBuddies.io para elegir otro juego',
    streamerMode: 'Modo Streamer',
    copyRoomLink: 'Copiar enlace de la sala',
    copyInviteLink: 'Copiar enlace de invitacion',
    login: 'Iniciar sesión',
    loginTitle: 'Inicia sesión o regístrate para guardar tu progreso, GP y premium',
    logout: 'Cerrar sesión',
  },

  // Video
  video: {
    joinVideo: 'Unirse al video',
    settingUp: 'Configurando...',
    leaveVideo: 'Salir del video chat',
    modal: {
      // Tabs
      tabDevices: 'Dispositivos',
      tabBackground: 'Fondo',
      tabAudio: 'Audio',
      tabAvatar: 'Avatar',
      // Titles
      titleSetup: 'Unirse al videochat',
      titleEdit: 'Ajustes de vídeo',
      titleSetupMobile: 'Configurar cámara',
      titleEditMobile: 'Ajustes de cámara',
      // Preview overlays
      cameraOff: 'Cámara apagada',
      loadingVirtualBg: 'Cargando fondo virtual...',
      virtualBgActive: 'Fondo virtual activo',
      // Devices tab
      camera: 'Cámara',
      microphone: 'Micrófono',
      noCameras: 'No se encontraron cámaras',
      noMicrophones: 'No se encontraron micrófonos',
      cameraFallback: 'Cámara {id}',
      microphoneFallback: 'Micrófono {id}',
      audioLevel: 'Nivel de audio',
      joinMuted: 'Unirse en silencio',
      joinCameraOff: 'Unirse con la cámara apagada',
      // Background tab
      vbBrowserWarning: 'Los fondos virtuales requieren Chrome 108+ o un navegador compatible con Insertable Streams.',
      enableVirtualBg: 'Activar fondo virtual',
      blur: 'Desenfoque',
      vbInfo: 'Los fondos virtuales usan segmentación con IA para reemplazar tu fondo en tiempo real.',
      // Audio tab
      aiNoiseSuppression: 'Supresión de ruido con IA',
      noiseThreshold: 'Umbral de ruido',
      sensitive: 'Sensible',
      aggressive: 'Agresivo',
      noiseInfo: 'Reduce el ruido de fondo como teclados, ventiladores y sonidos ambientales durante el videochat.',
      pushToTalk: 'Pulsar para hablar',
      pushToTalkInfo: 'Tu micrófono permanece silenciado hasta que mantengas pulsada la barra espaciadora para hablar.',
      // Avatar tab
      faceAvatar: 'Avatar facial 3D',
      avatarRaccoon: 'Mapache',
      avatarMetaHuman: 'Humano',
      avatarRobot: 'Robot',
      avatarAlien: 'Alien',
      avatarCat: 'Gato',
      soon: 'Próximo',
      avatarInfo: 'Tus movimientos faciales controlan un avatar 3D con seguimiento facial por IA. Tu rostro real nunca se muestra.',
      // Actions
      joinVideoChat: 'Unirse al videochat',
      saveSettings: 'Guardar ajustes',
    },
  },

  // Game
  game: {
    round: 'Ronda',
    score: 'Puntuacion',
    yourTurn: 'Tu turno',
    waitingForOthers: 'Esperando a los demas jugadores...',
    gameOver: 'Fin del juego',
    winner: 'Ganador',
    playAgain: 'Jugar de nuevo',
    returnToLobby: 'Volver a la sala',
  },

  // QR scan-to-join
  scanQr: {
    button: 'Escanear QR',
    hint: 'Apunta la cámara al código QR del TV',
    starting: 'Iniciando cámara…',
    permissionDenied: 'Cámara no disponible — haz una foto del código QR',
    cameraError: 'La cámara se detuvo — haz una foto del código QR',
    photoButton: 'Hacer una foto del código QR',
    photoProcessing: 'Leyendo la foto…',
    photoFailed: 'No se encontró ningún código QR — acércate a la pantalla e inténtalo de nuevo',
    photoUnreadable: 'No se pudo leer la foto — hazla de nuevo',
    libraryButton: 'Elegir de Fotos',
    joinTitle: '¡Código escaneado!',
    joinSubtitle: 'Escribe tu nombre para unirte a la sala {code}',
    joinCta: 'Unirse a la partida',
    notACode: 'No es un código de GameBuddies',
    close: 'Cerrar escáner',
  },

  // Chat
  chat: {
    typeMessage: 'Escribe un mensaje...',
    send: 'Enviar',
    noMessages: 'Aun no hay mensajes',
    // AI-TRANSLATED on 2026-05-19, please review
    title: 'Chat',
    sayHello: 'Saluda a tus companeros!',
    slowDown: 'Mas despacio...',
    openFull: 'Abrir chat completo',
    closeChat: 'Cerrar chat',
    sendMessage: 'Enviar mensaje',
  },

  // Kick toast
  // AI-TRANSLATED on 2026-05-19, please review
  kickToast: {
    title: 'Expulsado de la sala',
    close: 'Cerrar notificacion',
  },

  // Error boundary
  // AI-TRANSLATED on 2026-05-19, please review
  errorBoundary: {
    title: 'Algo salio mal',
    message: 'Lo sentimos, pero ocurrio algo inesperado.',
    refresh: 'Recargar pagina',
    goHome: 'Ir al inicio',
  },

  // Spectator banner
  // AI-TRANSLATED on 2026-05-19, please review
  spectator: {
    viewingAs: 'Viendo como {name}',
    spectating: 'Estas como espectador — haz clic en un jugador para ver su vista',
    resetView: 'Restablecer vista',
    badge: 'Espectador',
  },

  // Player list
  // AI-TRANSLATED on 2026-05-19, please review
  playerList: {
    removingIn: 'Eliminando en {seconds}s',
    removing: 'Eliminando...',
    kick: 'Expulsar',
    confirmKick: 'Confirmar expulsion',
    cancel: 'Cancelar',
    kickPlayer: 'Expulsar jugador',
    premium: 'Premium',
    pro: 'Pro',
    gameSkinLabel: 'Diseño del reverso',
    gameSkinSameAsCardStyle: 'Igual que el estilo de carta',
    gameSkinNone: 'Ninguno',
    gameSkinNeon: 'Neón',
    gameSkinGold: 'Oro',
    gameSkinHolo: 'Holo',
    gameSkinInk: 'Tinta',
  },

  // Streamer broadcast stage
  // AI-TRANSLATED on 2026-05-19, please review
  streamerStage: {
    waitingForPlayers: 'Esperando jugadores...',
    playersInLobby: '{count} jugador(es) en la sala',
    gameInProgress: 'Juego en curso',
    playersLabel: '{count} jugadores',
    gameOver: 'Fin del juego!',
    thanksForWatching: 'Gracias por ver',
    phaseWaiting: 'ESPERANDO',
    phasePlaying: 'JUGANDO',
    phaseEnded: 'FIN DEL JUEGO',
    resizeTiles: 'Arrastra para redimensionar',
  },

  // Video controls
  // AI-TRANSLATED on 2026-05-19, please review
  videoControl: {
    expandVideos: 'Expandir videos',
    collapseVideos: 'Contraer videos',
    videosLabel: 'Videos',
    cameraOn: 'Activar camara',
    cameraOff: 'Apagar camara',
    unmuteMic: 'Activar microfono',
    muteMic: 'Silenciar microfono',
    videoSettings: 'Ajustes de video',
    showVideos: 'Haz clic para mostrar videos',
    resizeHint: 'Arrastra para redimensionar, doble clic para contraer',
    noFeeds: 'No hay videos disponibles',
    yourTurn: 'Tu turno',
    connecting: 'Conectando…',
    reactions: 'Reacciones',
    pttLive: 'En vivo',
    premiumLockTooltip: 'Desbloquea con GameBuddies Premium',
    packSpicy: 'Picante',
    packWholesome: 'Tierno',
  },

  // Video enhancements panel
  // AI-TRANSLATED on 2026-05-19, please review
  videoEnhancements: {
    virtualBackground: 'Fondo virtual',
    faceAvatar: 'Avatar facial',
    noiseSuppression: 'Supresion de ruido',
    on: 'On',
    off: 'Off',
    none: 'Ninguno',
    blur: 'Desenfoque',
  },

  // Mobile menus
  // AI-TRANSLATED on 2026-05-19, please review
  menus: {
    openMenu: 'Abrir menu',
    closeMenu: 'Cerrar menu',
    menuTitle: 'Menu',
  },

  // Mobile hamburger menu items + drawer titles
  // AI-TRANSLATED on 2026-06-12, please review
  menu: {
    login: 'Iniciar sesión / Registrarse',
    loginSublabel: 'Guarda tus GP y premium',
    logout: 'Cerrar sesión',
    loggedIn: 'Sesión iniciada',
    premiumMember: 'Miembro premium',
    tapToCopy: 'Toca para copiar',
    linkCopied: '¡Enlace copiado!',
    streamerMode: 'Modo Streamer',
    chat: 'Chat',
    newMessages: '{count} mensajes nuevos',
    openChat: 'Abrir chat',
    players: 'Jugadores',
    videoChat: 'Videochat',
    videoOn: 'Vídeo activado',
    videoOff: 'Vídeo desactivado',
    tapToToggle: 'Toca para alternar',
    soundSettings: 'Ajustes de sonido',
    howToPlay: 'Cómo jugar',
    settings: 'Ajustes',
    returnToLobby: 'Volver a la sala',
    resetForAll: 'Reiniciar para todos',
    returnToGameBuddies: 'Volver a GameBuddies',
    backToLobby: 'Volver a la sala',
    leaveRoom: 'Salir de la sala',
  },

  // Game explainer modal
  // AI-TRANSLATED on 2026-05-19, please review
  gameExplainer: {
    closeHowToPlay: 'Cerrar instrucciones',
    tapForFullGuide: 'Toca para la guia completa',
  },

  // Bluffalo big-screen-only labels
  // AI-TRANSLATED on 2026-05-19, please review
  bluffaloBigScreen: {
    playersVoteContinue: 'Los jugadores votan para continuar…',
    playersVoteAgain: 'Los jugadores votan para jugar de nuevo…',
    countdownGo: 'YA!',
  },

  // In-game feedback / bug report modal
  feedback: {
    menuLabel: 'Reportar un problema',
    title: 'Reportar un problema',
    intro: '¿Encontraste un error o tienes una idea? Cuéntanos, leemos cada reporte.',
    typeBug: 'Error',
    typeIdea: 'Idea',
    typeOther: 'Otro',
    messagePlaceholder: '¿Qué pasó? Cuantos más detalles, mejor.',
    roomLabel: 'Sala',
    stateAttachedNote: 'Se adjunta el estado actual de tu partida para ayudarnos a depurar.',
    submit: 'Enviar reporte',
    sending: 'Enviando…',
    successTitle: '¡Gracias por el reporte!',
    successBody: 'Fue directo al equipo de GameBuddies.',
    errorMsg: 'No se pudo enviar tu reporte. Inténtalo de nuevo.',
    tooShort: 'Añade un poco más de detalle, por favor.',
  },

  // Legal
  legal: {
    impressum: 'Aviso legal',
    privacy: 'Privacidad',
    terms: 'Términos',
    section: 'Legal',
  },

  // In-game login/signup modal (GameAuthModal)
  authModal: {
    titleSignin: 'Iniciar sesión',
    titleSignup: 'Crear cuenta',
    tabSignin: 'Iniciar sesión',
    tabSignup: 'Registrarse',
    benefits: 'Guarda tus GP, racha y premium en todos los juegos de GameBuddies',
    email: 'Correo electrónico',
    password: 'Contraseña',
    confirmPassword: 'Confirmar contraseña',
    rememberMe: 'Mantener la sesión iniciada',
    consent: 'Tengo 16 años o más y acepto los Términos y la Política de Privacidad',
    submitSignin: 'Iniciar sesión',
    submitSignup: 'Registrarse',
    submitting: 'Espera…',
    orEmail: 'o con correo',
    google: 'Continuar con Google',
    discord: 'Continuar con Discord',
    fillAllFields: 'Completa todos los campos, por favor.',
    passwordMinLength: 'La contraseña debe tener al menos 6 caracteres.',
    passwordsMismatch: 'Las contraseñas no coinciden.',
    consentRequired: 'Confirma tu edad y los términos para continuar.',
    emailAlreadyRegistered: 'Este correo ya está registrado — inicia sesión.',
    authFailed: 'No se pudo iniciar sesión. Inténtalo de nuevo.',
    popupClosed: 'La ventana de inicio de sesión se cerró antes de terminar.',
    pendingConfirmTitle: 'Revisa tu correo',
    pendingConfirmBody: 'Te enviamos un enlace de confirmación. Tras confirmar, iniciarás sesión automáticamente.',
    successTitle: '¡Sesión iniciada!',
  },

  // Settings
  settings: {
    title: 'Configuracion',
    general: 'General',
    theme: 'Tema',
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    audio: 'Audio',
    video: 'Video',
    language: 'Idioma',
    music: 'Musica',
    soundEffects: 'Efectos de sonido',
    backgroundMusic: 'Musica de fondo',
    volume: 'Volumen',
    camera: 'Camara',
    microphone: 'Microfono',
    virtualBackground: 'Fondo virtual',
    videoDescription: 'Configura los ajustes de tu camara y microfono.',
  },

  // Invite Modal
  invite: {
    title: 'Estas invitado!',
    subtitle: 'Ingresa tu nombre para unirte al juego',
    joinGame: 'Unirse al juego',
  },

  // Big Screen (TV / PC / Discord stream mode)
  bigScreen: {
    branding: 'Pantalla Grande · GameBuddies.io',
    joinTheGame: 'Unete al juego',
    roomCode: 'Codigo de sala',
    qrAlt: 'Codigo QR para unirse a la sala {code}',
    scanWithPhone: 'Escanea con tu telefono',
    playersCount: 'Jugadores ({count}/{max})',
    needMoreToStart: 'Faltan {count} para empezar',
    readyToStart: 'Listo para empezar',
    waitingForPlayersToJoin: 'Esperando a que se unan jugadores…',
    startGame: 'Iniciar juego',
    waitingForMorePlayers: 'Esperando a {count} jugador(es) mas…',
    bluffsIn: '{count} de {total} trampa(s) enviada(s)',
    voteBadge: 'Votacion · Ronda {round}/{total}',
    votedCount: '{count} / {total} votaron',
    continueReady: 'Continuar · {count} / {total} listos',
    byAuthor: 'por {name}',
    noVotes: 'Sin votos',
    nextRoundReady: 'Siguiente ronda · {count} / {total} listos',
    thisRound: 'Esta ronda',
    foundTruth: 'Encontro la verdad',
    fooledVoter: 'Engaño a {name}',
    selfVote: 'Voto por su propia mentira',
    gameOverBadge: 'Fin del juego',
    playAgainReady: 'Jugar de nuevo · {count} / {total} listos',
    champion: 'Campeon',
    points: '{n} pts',
    liesFooledTooltip: 'Mentiras que engañaron a alguien',
    correctGuessesTooltip: 'Aciertos',
  },

  // Bluffalo
  bluffalo: {
    getReady: 'Preparate...',
    roundOf: 'Ronda {current} de {total}',
    writeYourLie: 'Escribe tu mentira!',
    liePlaceholder: 'Escribe una respuesta falsa creible...',
    submitLie: 'Enviar mentira',
    lieSubmitted: 'Mentira enviada!',
    waitingForLies: 'Esperando a los demas...',
    liesSubmitted: '{count}/{total} enviadas',
    charCount: '{count}/{max}',
    whichIsReal: 'Cual respuesta es real?',
    castYourVote: 'Votar',
    voteSubmitted: 'Voto enviado!',
    waitingForVotes: 'Esperando votos...',
    votesSubmitted: '{count}/{total} votaron',
    theAnswerIs: 'La respuesta es...',
    correctAnswer: 'Correcto!',
    fooledBy: 'Escrita por {name}',
    nobodyFooled: 'Nadie fue enganado!',
    youFoundTruth: 'Encontraste la verdad!',
    youWereFooled: 'Te enganaron!',
    youDidNotVote: 'No votaste.',
    pointsEarned: '+{points}',
    // Score event reasons (server sends structured keys; client translates)
    scoreFoundTruth: '¡Encontraste la verdad!',
    scoreFooled: '¡Engañaste a {name}!',
    scoreSelfVote: '¡Votaste por tu propia mentira!',
    roundScores: 'Puntuacion de la ronda',
    nextRound: 'Siguiente ronda',
    finalStandings: 'Clasificacion final',
    champion: 'Campeon!',
    liesFooled: 'Mentiras exitosas',
    correctGuesses: 'Respuestas correctas',
    timesDeceived: 'Veces enganado',
    totalScore: 'Puntuacion total',
    hostSettings: 'Configuracion del juego',
    rounds: 'Rondas',
    lieTime: 'Tiempo para mentir',
    voteTime: 'Tiempo para votar',
    revealTime: 'Tiempo de revelacion',
    category: 'Categoria',
    pointsCorrect: 'Puntos por correcto',
    pointsPerFool: 'Puntos por engano',
    seconds: '{n}s',
    lowQuestionWarning: 'Solo hay {count} preguntas en este idioma: las rondas adicionales seran en ingles.',
    catHistory: 'Historia',
    catScience: 'Ciencia',
    catGeography: 'Geografia',
    catEntertainment: 'Entretenimiento',
    catSports: 'Deportes',
    catFood: 'Comida y bebida',
    catWeird: 'Datos curiosos',
    catRandom: 'Aleatorio (Todos)',
    lieTooSimilar: 'Tu respuesta es demasiado similar a la real!',
    lieDuplicate: 'Alguien ya envio esa respuesta!',
    yourLie: 'Tu mentira',
    pts: 'pts',
  },

  // Errors
  errors: {
    connectionLost: 'Conexion perdida',
    roomNotFound: 'Sala no encontrada',
    roomFull: 'La sala esta llena',
    invalidName: 'Por favor ingresa un nombre valido',
    invalidRoomCode: 'Por favor ingresa un codigo de sala valido',
  },

  // Reconnect
  reconnect: {
    title: 'Juego restaurado',
    playersReconnected: '{connected}/{total} reconectados',
    resumeGame: 'Reanudar juego',
    waitingForHost: 'Esperando al host...',
    reloadPage: 'Recargar página',
    reload: 'Recargar',
  },
  homeMenu: {
    howToPlay: 'Cómo jugar',
    learnTheRules: 'Aprende las reglas',
    soundAndPreferences: 'Sonido y preferencias',
  },

  // Platform profile peek card (gb:player:profile)
  playerCard: {
    level: 'Nivel {level}',
    gabuPoints: 'GabuPoints',
    dailyStreak: 'Racha diaria',
    winsInGame: 'Victorias en este juego',
    achievements: 'Logros ({count})',
  },

  // Lobby invite panel (GameBuddies friends + QR)
  invitePanel: {
    friendsTitle: 'Invitar amigos',
    invite: 'Invitar',
    sent: '¡Enviado!',
    failed: 'Error',
    qr: 'Código QR',
  },
  installPrompt: {
    title: 'Instalar juego',
    iosSubtitle: '¡Disfruta de la experiencia a pantalla completa!',
    androidSubtitle: '¡Añade a la pantalla de inicio para jugar a pantalla completa!',
    iosStep1Prefix: 'Toca el',
    iosStep1Suffix: 'botón Compartir de abajo',
    iosStep2: 'Desplázate y toca «Añadir a pantalla de inicio»',
    iosStep3: 'Toca «Añadir» para instalar',
    installApp: 'Instalar app',
    dontShowAgain: 'No mostrar de nuevo',
  },
  portalClose: {
    returningCountdown: 'Volviendo a GameBuddies en {countdown} segundos',
    returningEveryone: 'Devolviendo a todos a la sala...',
    returningToGameBuddies: 'Volviendo a GameBuddies...',
  },
  loadingScreen: {
    connecting: 'Conectando',
    hint1: '¡Prepárate para jugar!',
    hint2: '¡Reúne a tus amigos!',
    hint3: '¡La diversión está a punto de empezar!',
    hint4: 'Cargando una partida increíble...',
    hint5: '¡Preparando la sala de juego!',
    hint6: '¡Ya casi está!',
  },
  heartsGambit: {
    cardValue: 'Valor:',
  },
  gameAd: {
    support: 'Apoya a GameBuddies',
    helpKeepFree: '¡La publicidad mantiene los juegos gratis!',
  },
  psDemo: {
    seenByLou: 'VISTO POR LOU',
    arrested: 'DETENIDO',
    peek: 'ESPIAR',
    correctArrested: '✓ CORRECTO — DETENIDO',
  },
  xp: {
    levelUp: '¡SUBISTE DE NIVEL!',
    xpGained: 'XP GANADA',
    victory: '🏆 Victoria',
    played: '💪 Jugado',
    dismiss: 'Cerrar notificación',
    base: 'Base',
    win: 'Victoria',
    length: 'duración',
    streak: '{count} de racha',
    firstWin: 'Primera victoria',
    xpBoost: 'Bonus XP 2×',
    lv: 'Nv',
    levelsGained: '¡+{count} niveles!',
  },
  adminMessage: {
    title: 'Mensaje de GameBuddies',
    replySent: 'Respuesta enviada ✓',
    replyPlaceholder: 'Responder a GameBuddies…',
    sendReply: 'Enviar respuesta',
  },
  mute: {
    mute: 'Silenciar',
    unmute: 'Activar sonido',
    muteAudio: 'Silenciar audio del juego',
    unmuteAudio: 'Activar audio del juego',
  },
  shell: {
    collapseSidebar: 'Contraer barra lateral',
    showSidebar: 'Mostrar barra lateral',
    hideSidebar: 'Ocultar barra lateral',
  },
};
