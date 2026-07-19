/**
 * German Translations
 * TODO: Add your game-specific translations
 */

import type { Translations } from './en';

export const de: Translations = {
  presets: {
    title: 'Gespeicherte Einstellungen',
    namePlaceholder: 'Name der Vorlage…',
    save: 'Speichern',
    saved: 'Vorlage gespeichert.',
    apply: 'Vorlage anwenden',
    applied: 'Einstellungen übernommen.',
    delete: 'Vorlage löschen',
    empty: 'Speichere deine aktuellen Einstellungen für das nächste Mal.',
    signInHint: 'Melde dich an, um deine Lieblingseinstellungen zu speichern.',
    errorDuplicate: 'Du hast bereits eine Vorlage mit diesem Namen.',
    errorLimit: 'Limit erreicht (10 Vorlagen). Lösche zuerst eine.',
    errorNotInLobby: 'Vorlagen können nur in der Lobby angewendet werden.',
    errorGeneric: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.',
  },
  // Lobby explainer (animated demo)
  explainer: {
    bluffalo: {
      beat1: 'Eine kniffelige Trivia-Frage erscheint.',
      beat2: 'Jeder Spieler schreibt eine glaubwürdige Lüge.',
      beat3: 'Die echte Antwort wird unter die Lügen gemischt.',
      beat4: 'Stimmt ab, welche Antwort die echte ist.',
      beat5: 'Punkte für die Wahrheit — und für gelungene Bluffs.',
    },
  },

  // Common
  common: {
    loading: 'Laden...',
    error: 'Fehler',
    close: 'Schließen',
    save: 'Speichern',
    cancel: 'Abbrechen',
    confirm: 'Bestätigen',
    yes: 'Ja',
    no: 'Nein',
    ok: 'OK',
    back: 'Zurück',
    next: 'Weiter',
    start: 'Start',
    stop: 'Stopp',
    retry: 'Erneut versuchen',
  },

  // Homepage
  home: {
    title: 'Bluffalo',
    createRoom: 'Raum erstellen',
    joinRoom: 'Raum beitreten',
    yourName: 'Dein Name',
    roomCode: 'Raum-Code',
    enterName: 'Gib deinen Namen ein',
    enterRoomCode: 'Gib den Raum-Code ein',
    create: 'Erstellen',
    join: 'Beitreten',
    createDescription: 'Starte ein neues Spiel und lade Freunde ein',
    joinDescription: 'Trete einem bestehenden Raum bei',
    streamerMode: 'Streamer-Modus (Raum-Code verstecken)',
    streamerModeHint: 'Raum-Code für Streaming verstecken',
    bigScreenMode: 'Großer Bildschirm (TV — Spieler joinen mit dem Handy)',
    startBigScreen: 'Großen Bildschirm starten',
    howToPlay: 'Spielanleitung',
    tip: 'Tipp: Teile deinen Raum-Code mit Freunden, um zusammen zu spielen!',
    multiplayerTip: 'Dies ist ein Multiplayer-Spiel — schnapp dir deine Freunde und spielt zusammen!',
    gameBuddiesBanner: 'Spielen über GameBuddies.io',
    multiplayerBadge: '{min}-{max} Spieler',
    step1Title: 'Raum erstellen',
    step2Title: 'Link teilen',
    step3Title: 'Zusammen spielen',
    inviteFirst: 'Erst Freunde einladen?',
    copyLink: 'Link kopieren',
    linkCopied: 'Kopiert!',
    whatsapp: 'WhatsApp',
    share: 'Teilen',
    whatsappText: "Lass uns {game} spielen! {url}",
  },

  // Lobby
  lobby: {
    title: 'Lobby',
    waitingForPlayers: 'Warte auf Spieler...',
    players: 'Spieler',
    chat: 'Chat',
    settings: 'Einstellungen',
    startGame: 'Spiel starten',
    leaveRoom: 'Raum verlassen',
    copyLink: 'Link kopieren',
    linkCopied: 'Link kopiert!',
    host: 'Host',
    you: 'Du',
    minPlayersRequired: 'Mindestens {min} Spieler erforderlich',
    shareCode: 'Code teilen',
    waitingForHost: 'Warte auf Host...',
    inviteTitle: 'Lade deine Freunde ein',
    copyInviteLink: 'Einladungslink kopieren',
    scanToJoin: 'Scannen, um auf jedem Handy beizutreten',
    needMorePlayers: 'Noch {count} Spieler benötigt',
    shareToInvite: 'Teile den Link, damit deine Freunde beitreten können!',
  },

  // Header
  header: {
    room: 'Raum:',
    tryAnotherGame: 'Anderes Spiel',
    tryAnotherGameTitle: 'Zurück zu GameBuddies.io um ein anderes Spiel zu wählen',
    streamerMode: 'Streamer-Modus',
    copyRoomLink: 'Raum-Link kopieren',
    copyInviteLink: 'Einladungslink kopieren',
    login: 'Anmelden',
    loginTitle: 'Melde dich an oder registriere dich, um Fortschritt, GP und Premium zu sichern',
    logout: 'Abmelden',
  },

  // Video
  video: {
    joinVideo: 'Video beitreten',
    settingUp: 'Einrichten...',
    leaveVideo: 'Video-Chat verlassen',
    modal: {
      // Tabs
      tabDevices: 'Geräte',
      tabBackground: 'Hintergrund',
      tabAudio: 'Audio',
      tabAvatar: 'Avatar',
      // Titles
      titleSetup: 'Videochat beitreten',
      titleEdit: 'Video-Einstellungen',
      titleSetupMobile: 'Kamera-Einrichtung',
      titleEditMobile: 'Kamera-Einstellungen',
      // Preview overlays
      cameraOff: 'Kamera aus',
      loadingVirtualBg: 'Virtueller Hintergrund wird geladen...',
      virtualBgActive: 'Virt. Hintergrund aktiv',
      // Devices tab
      camera: 'Kamera',
      microphone: 'Mikrofon',
      noCameras: 'Keine Kameras gefunden',
      noMicrophones: 'Keine Mikrofone gefunden',
      cameraFallback: 'Kamera {id}',
      microphoneFallback: 'Mikrofon {id}',
      audioLevel: 'Audiopegel',
      joinMuted: 'Stumm beitreten',
      joinCameraOff: 'Mit ausgeschalteter Kamera beitreten',
      // Background tab
      vbBrowserWarning: 'Virtuelle Hintergründe benötigen Chrome 108+ oder einen Browser mit Insertable-Streams-Unterstützung.',
      enableVirtualBg: 'Virtuellen Hintergrund aktivieren',
      blur: 'Unschärfe',
      vbInfo: 'Virtuelle Hintergründe nutzen KI-Segmentierung, um deinen Hintergrund in Echtzeit zu ersetzen.',
      // Audio tab
      aiNoiseSuppression: 'KI-Geräuschunterdrückung',
      noiseThreshold: 'Geräuschschwelle',
      sensitive: 'Sensibel',
      aggressive: 'Aggressiv',
      noiseInfo: 'Reduziert Hintergrundgeräusche wie Tastaturklicks, Lüfter und Umgebungsgeräusche während des Videochats.',
      pushToTalk: 'Push-to-Talk',
      pushToTalkInfo: 'Dein Mikro bleibt stumm, bis du die Leertaste gedrückt hältst, um zu sprechen.',
      // Avatar tab
      faceAvatar: '3D-Gesichts-Avatar',
      avatarRaccoon: 'Waschbär',
      avatarMetaHuman: 'Mensch',
      avatarRobot: 'Roboter',
      avatarAlien: 'Alien',
      avatarCat: 'Katze',
      soon: 'Bald',
      avatarInfo: 'Deine Gesichtsbewegungen steuern einen 3D-Avatar per KI-Gesichtserkennung. Dein echtes Gesicht wird nie gezeigt.',
      // Actions
      joinVideoChat: 'Videochat beitreten',
      saveSettings: 'Einstellungen speichern',
    },
  },

  // Game
  game: {
    round: 'Runde',
    score: 'Punkte',
    yourTurn: 'Du bist dran',
    waitingForOthers: 'Warte auf andere Spieler...',
    gameOver: 'Spiel vorbei!',
    winner: 'Gewinner',
    playAgain: 'Nochmal spielen',
    returnToLobby: 'Zurück zur Lobby',
  },

  // Big Screen (TV / PC / Discord stream mode)
  bigScreen: {
    branding: 'Großer Bildschirm · GameBuddies.io',
    joinTheGame: 'Dem Spiel beitreten',
    roomCode: 'Raum-Code',
    qrAlt: 'QR-Code zum Beitreten von Raum {code}',
    scanWithPhone: 'Mit dem Handy scannen',
    playersCount: 'Spieler ({count}/{max})',
    needMoreToStart: 'Noch {count} zum Starten nötig',
    readyToStart: 'Bereit zum Starten',
    waitingForPlayersToJoin: 'Warte auf Spieler…',
    startGame: 'Spiel starten',
    waitingForMorePlayers: 'Warte auf {count} weitere(n) Spieler…',
    bluffsIn: '{count} von {total} Bluffs abgegeben',
    voteBadge: 'Abstimmung · Runde {round}/{total}',
    votedCount: '{count} / {total} abgestimmt',
    continueReady: 'Weiter · {count} / {total} bereit',
    byAuthor: 'von {name}',
    noVotes: 'Keine Stimmen',
    nextRoundReady: 'Nächste Runde · {count} / {total} bereit',
    thisRound: 'Diese Runde',
    foundTruth: 'Wahrheit gefunden',
    fooledVoter: '{name} getäuscht',
    selfVote: 'Für eigene Lüge gestimmt',
    gameOverBadge: 'Spiel vorbei',
    playAgainReady: 'Nochmal spielen · {count} / {total} bereit',
    champion: 'Champion',
    points: '{n} Pkt.',
    liesFooledTooltip: 'Lügen, die jemanden getäuscht haben',
    correctGuessesTooltip: 'Richtige Tipps',
  },

  // Bluffalo-specific
  bluffalo: {
    getReady: 'Macht euch bereit...',
    roundOf: 'Runde {current} von {total}',
    writeYourLie: 'Schreib deine Lüge!',
    liePlaceholder: 'Tippe eine glaubwürdige falsche Antwort...',
    submitLie: 'Lüge abschicken',
    lieSubmitted: 'Lüge abgeschickt!',
    waitingForLies: 'Warte auf die Lügen der anderen...',
    liesSubmitted: '{count}/{total} abgeschickt',
    charCount: '{count}/{max}',
    whichIsReal: 'Welche Antwort ist echt?',
    castYourVote: 'Stimme ab',
    voteSubmitted: 'Abgestimmt!',
    waitingForVotes: 'Warte auf Stimmen...',
    votesSubmitted: '{count}/{total} abgestimmt',
    theAnswerIs: 'Die Antwort ist...',
    correctAnswer: 'Richtig!',
    fooledBy: 'Geschrieben von {name}',
    nobodyFooled: 'Niemand wurde getäuscht!',
    youFoundTruth: 'Du hast die Wahrheit gefunden!',
    youWereFooled: 'Du wurdest getäuscht!',
    youDidNotVote: 'Du hast nicht abgestimmt.',
    pointsEarned: '+{points}',
    // Score event reasons (server sends structured keys; client translates)
    scoreFoundTruth: 'Wahrheit gefunden!',
    scoreFooled: '{name} getäuscht!',
    scoreSelfVote: 'Für eigene Lüge gestimmt!',
    roundScores: 'Rundenpunkte',
    nextRound: 'Nächste Runde',
    finalStandings: 'Endstand',
    champion: 'Champion!',
    liesFooled: 'Lügen getäuscht',
    correctGuesses: 'Richtige Antworten',
    timesDeceived: 'Mal getäuscht',
    totalScore: 'Gesamtpunkte',
    hostSettings: 'Spieleinstellungen',
    rounds: 'Runden',
    lieTime: 'Lügenzeit',
    voteTime: 'Abstimmungszeit',
    revealTime: 'Auflösungszeit',
    category: 'Kategorie',
    pointsCorrect: 'Punkte für Richtig',
    pointsPerFool: 'Punkte pro Täuschung',
    seconds: '{n}s',
    lowQuestionWarning: 'Nur {count} Fragen in dieser Sprache verfügbar — zusätzliche Runden sind auf Englisch.',
    catHistory: 'Geschichte',
    catScience: 'Wissenschaft',
    catGeography: 'Geografie',
    catEntertainment: 'Unterhaltung',
    catSports: 'Sport',
    catFood: 'Essen & Trinken',
    catWeird: 'Kurioses',
    catRandom: 'Zufällig (Alle)',
    lieTooSimilar: 'Deine Antwort ist zu ähnlich zur echten!',
    lieDuplicate: 'Diese Antwort wurde bereits eingereicht!',
    yourLie: 'Deine Lüge',
    pts: 'Pkt',
  },

  // QR scan-to-join
  scanQr: {
    button: 'QR scannen',
    hint: 'Richte die Kamera auf den QR-Code auf dem TV',
    starting: 'Kamera wird gestartet…',
    permissionDenied: 'Kamera nicht verfügbar — mach stattdessen ein Foto vom QR-Code',
    cameraError: 'Die Kamera wurde beendet — mach stattdessen ein Foto vom QR-Code',
    photoButton: 'Foto vom QR-Code machen',
    photoProcessing: 'Foto wird ausgelesen…',
    photoFailed: 'Kein QR-Code gefunden — geh näher an den Bildschirm und versuch es nochmal',
    photoUnreadable: 'Das Foto konnte nicht gelesen werden — bitte mach es noch einmal',
    libraryButton: 'Aus Fotos auswählen',
    joinTitle: 'Code gescannt!',
    joinSubtitle: 'Gib deinen Namen ein, um Raum {code} beizutreten',
    joinCta: 'Mitspielen',
    notACode: 'Kein GameBuddies-Code',
    close: 'Scanner schließen',
  },

  // Chat
  chat: {
    typeMessage: 'Nachricht eingeben...',
    send: 'Senden',
    noMessages: 'Noch keine Nachrichten',
    // AI-TRANSLATED on 2026-05-19, please review
    title: 'Chat',
    sayHello: 'Sag deinen Mitspielern Hallo!',
    slowDown: 'Langsamer...',
    openFull: 'Vollständigen Chat öffnen',
    closeChat: 'Chat schließen',
    sendMessage: 'Nachricht senden',
  },

  // Kick toast
  // AI-TRANSLATED on 2026-05-19, please review
  kickToast: {
    title: 'Aus Raum entfernt',
    close: 'Benachrichtigung schließen',
  },

  // Error boundary
  // AI-TRANSLATED on 2026-05-19, please review
  errorBoundary: {
    title: 'Etwas ist schiefgelaufen',
    message: 'Es tut uns leid, aber etwas Unerwartetes ist passiert.',
    refresh: 'Seite neu laden',
    goHome: 'Zur Startseite',
  },

  // Spectator banner
  // AI-TRANSLATED on 2026-05-19, please review
  spectator: {
    viewingAs: 'Ansicht als {name}',
    spectating: 'Du bist Zuschauer — klicke auf einen Spieler, um dessen Ansicht zu sehen',
    resetView: 'Ansicht zurücksetzen',
    badge: 'Zuschauer',
  },

  // Player list
  // AI-TRANSLATED on 2026-05-19, please review
  playerList: {
    removingIn: 'Entfernt in {seconds}s',
    removing: 'Wird entfernt...',
    kick: 'Kicken',
    confirmKick: 'Kick bestätigen',
    cancel: 'Abbrechen',
    kickPlayer: 'Spieler kicken',
    makeHost: 'Zum Host machen',
    confirmMakeHost: 'Host-Übergabe bestätigen',
    premium: 'Premium',
    pro: 'Pro',
    gameSkinLabel: 'Kartenrücken-Skin',
    gameSkinSameAsCardStyle: 'Wie Kartenstil',
    gameSkinNone: 'Keiner',
    gameSkinNeon: 'Neon',
    gameSkinGold: 'Gold',
    gameSkinHolo: 'Holo',
    gameSkinInk: 'Tinte',
    gameSkinPreviewCaption: 'Vorschau',
  },

  // Streamer broadcast stage
  // AI-TRANSLATED on 2026-05-19, please review
  streamerStage: {
    waitingForPlayers: 'Warte auf Spieler...',
    playersInLobby: '{count} Spieler in der Lobby',
    gameInProgress: 'Spiel läuft',
    playersLabel: '{count} Spieler',
    gameOver: 'Spiel vorbei!',
    thanksForWatching: 'Danke fürs Zuschauen',
    phaseWaiting: 'WARTEN',
    phasePlaying: 'SPIEL LÄUFT',
    phaseEnded: 'SPIEL VORBEI',
    resizeTiles: 'Ziehen, um Kacheln zu skalieren',
  },

  // Video controls
  // AI-TRANSLATED on 2026-05-19, please review
  videoControl: {
    expandVideos: 'Videos einblenden',
    collapseVideos: 'Videos ausblenden',
    videosLabel: 'Videos',
    cameraOn: 'Kamera einschalten',
    cameraOff: 'Kamera ausschalten',
    unmuteMic: 'Mikrofon einschalten',
    muteMic: 'Mikrofon stummschalten',
    videoSettings: 'Video-Einstellungen',
    showVideos: 'Klicken, um Videos anzuzeigen',
    resizeHint: 'Ziehen zum Skalieren, Doppelklick zum Einklappen',
    noFeeds: 'Keine Videofeeds verfügbar',
    yourTurn: 'Du bist dran',
    connecting: 'Verbinde…',
    reactions: 'Reaktionen',
    pttLive: 'Live',
    premiumLockTooltip: 'Mit GameBuddies Premium freischalten',
    packSpicy: 'Scharf',
    packWholesome: 'Herzig',
  },

  premiumUpsell: {
    getPremium: 'Premium holen',
    tryTrial: 'Premium mit Gabu-Punkten testen',
  },

  // Video enhancements panel
  // AI-TRANSLATED on 2026-05-19, please review
  videoEnhancements: {
    virtualBackground: 'Virtueller Hintergrund',
    faceAvatar: 'Gesichts-Avatar',
    noiseSuppression: 'Geräuschunterdrückung',
    on: 'An',
    off: 'Aus',
    none: 'Keiner',
    blur: 'Unschärfe',
  },

  // Mobile menus
  // AI-TRANSLATED on 2026-05-19, please review
  menus: {
    openMenu: 'Menü öffnen',
    closeMenu: 'Menü schließen',
    menuTitle: 'Menü',
  },

  // Mobile hamburger menu items + drawer titles
  // AI-TRANSLATED on 2026-06-12, please review
  menu: {
    login: 'Anmelden / Registrieren',
    loginSublabel: 'Sichere deine GP & Premium',
    logout: 'Abmelden',
    loggedIn: 'Angemeldet',
    premiumMember: 'Premium-Mitglied',
    tapToCopy: 'Zum Kopieren tippen',
    linkCopied: 'Link kopiert!',
    streamerMode: 'Streamer-Modus',
    chat: 'Chat',
    newMessages: '{count} neue Nachrichten',
    openChat: 'Chat öffnen',
    players: 'Spieler',
    videoChat: 'Videochat',
    videoOn: 'Video an',
    videoOff: 'Video aus',
    tapToToggle: 'Zum Umschalten tippen',
    soundSettings: 'Sound-Einstellungen',
    howToPlay: 'Spielanleitung',
    settings: 'Einstellungen',
    returnToLobby: 'Zurück zur Lobby',
    resetForAll: 'Für alle Spieler zurücksetzen',
    returnToGameBuddies: 'Zurück zu GameBuddies',
    backToLobby: 'Zurück zur Lobby',
    leaveRoom: 'Raum verlassen',
  },

  // Game explainer modal
  // AI-TRANSLATED on 2026-05-19, please review
  gameExplainer: {
    closeHowToPlay: 'Spielanleitung schließen',
    tapForFullGuide: 'Tippen für die vollständige Anleitung',
  },

  // Bluffalo big-screen-only labels
  // AI-TRANSLATED on 2026-05-19, please review
  bluffaloBigScreen: {
    playersVoteContinue: 'Spieler stimmen ab, um fortzufahren…',
    playersVoteAgain: 'Spieler stimmen ab, um erneut zu spielen…',
    countdownGo: 'LOS!',
  },

  // In-game feedback / bug report modal
  feedback: {
    menuLabel: 'Problem melden',
    title: 'Problem melden',
    intro: 'Fehler gefunden oder eine Idee? Sag es uns — wir lesen jede Meldung.',
    typeBug: 'Fehler',
    typeIdea: 'Idee',
    typeOther: 'Sonstiges',
    messagePlaceholder: 'Was ist passiert? Je mehr Details, desto besser.',
    roomLabel: 'Raum',
    stateAttachedNote: 'Dein aktueller Spielstand wird zur Fehlersuche mitgeschickt.',
    submit: 'Meldung senden',
    sending: 'Wird gesendet…',
    successTitle: 'Danke für die Meldung!',
    successBody: 'Sie ging direkt an das GameBuddies-Team.',
    errorMsg: 'Meldung konnte nicht gesendet werden. Bitte versuche es erneut.',
    tooShort: 'Bitte etwas mehr Details ergänzen.',
  },

  // Legal
  legal: {
    impressum: 'Impressum',
    privacy: 'Datenschutz',
    terms: 'AGB',
    section: 'Rechtliches',
  },

  // In-game login/signup modal (GameAuthModal)
  authModal: {
    titleSignin: 'Anmelden',
    titleSignup: 'Konto erstellen',
    tabSignin: 'Anmelden',
    tabSignup: 'Registrieren',
    benefits: 'Sichere deine GP, Streak & Premium in allen GameBuddies-Spielen',
    email: 'E-Mail',
    password: 'Passwort',
    confirmPassword: 'Passwort bestätigen',
    rememberMe: 'Angemeldet bleiben',
    consent: 'Ich bin mindestens 16 Jahre alt und akzeptiere die AGB & Datenschutzerklärung',
    submitSignin: 'Anmelden',
    submitSignup: 'Registrieren',
    submitting: 'Bitte warten…',
    orEmail: 'oder per E-Mail',
    google: 'Weiter mit Google',
    discord: 'Weiter mit Discord',
    fillAllFields: 'Bitte alle Felder ausfüllen.',
    passwordMinLength: 'Das Passwort muss mindestens 6 Zeichen haben.',
    passwordsMismatch: 'Die Passwörter stimmen nicht überein.',
    consentRequired: 'Bitte Alter und AGB bestätigen, um fortzufahren.',
    emailAlreadyRegistered: 'Diese E-Mail ist bereits registriert — melde dich stattdessen an.',
    authFailed: 'Anmeldung fehlgeschlagen. Bitte erneut versuchen.',
    popupClosed: 'Das Anmeldefenster wurde vorzeitig geschlossen.',
    pendingConfirmTitle: 'Prüfe deine E-Mails',
    pendingConfirmBody: 'Wir haben dir einen Bestätigungslink geschickt. Nach der Bestätigung wirst du automatisch angemeldet.',
    successTitle: 'Angemeldet!',
  },

  // Settings
  settings: {
    title: 'Einstellungen',
    general: 'Allgemein',
    theme: 'Design',
    themeDark: 'Dunkel',
    themeLight: 'Hell',
    audio: 'Audio',
    video: 'Video',
    language: 'Sprache',
    music: 'Musik',
    soundEffects: 'Soundeffekte',
    backgroundMusic: 'Hintergrundmusik',
    volume: 'Lautstärke',
    camera: 'Kamera',
    microphone: 'Mikrofon',
    virtualBackground: 'Virtueller Hintergrund',
    videoDescription: 'Konfiguriere deine Kamera- und Mikrofoneinstellungen.',
  },

  // Invite Modal
  invite: {
    title: 'Du bist eingeladen!',
    subtitle: 'Gib deinen Namen ein, um dem Spiel beizutreten',
    joinGame: 'Spiel beitreten',
  },

  // Errors
  errors: {
    connectionLost: 'Verbindung verloren',
    roomNotFound: 'Raum nicht gefunden',
    roomFull: 'Raum ist voll',
    invalidName: 'Bitte gib einen gültigen Namen ein',
    invalidRoomCode: 'Bitte gib einen gültigen Raum-Code ein',
    contentFilterTitle: 'Inhaltsfilter',
    contentFilterBody: 'Vom Inhaltsfilter blockiert — bitte anders formulieren.',
  },

  reconnect: {
    title: 'Spiel wiederhergestellt',
    playersReconnected: '{connected}/{total} verbunden',
    resumeGame: 'Spiel fortsetzen',
    waitingForHost: 'Warte auf den Host...',
    reloadPage: 'Seite neu laden',
    reload: 'Neu laden',
  },
  homeMenu: {
    howToPlay: 'Spielanleitung',
    learnTheRules: 'Lerne die Regeln',
    soundAndPreferences: 'Sound & Einstellungen',
  },

  // Platform profile peek card (gb:player:profile)
  playerCard: {
    level: 'Level {level}',
    gabuPoints: 'GabuPoints',
    dailyStreak: 'Tages-Serie',
    winsInGame: 'Siege in diesem Spiel',
    achievements: 'Erfolge ({count})',
  },

  // Lobby invite panel (GameBuddies friends + QR)
  invitePanel: {
    friendsTitle: 'Freunde einladen',
    invite: 'Einladen',
    sent: 'Gesendet!',
    failed: 'Fehler',
    qr: 'QR-Code',
  },
  installPrompt: {
    title: 'Spiel installieren',
    iosSubtitle: 'Hol dir das Vollbild-Erlebnis!',
    androidSubtitle: 'Zum Startbildschirm hinzufügen für Vollbild-Spiel!',
    iosStep1Prefix: 'Tippe auf den',
    iosStep1Suffix: 'Teilen-Button unten',
    iosStep2: 'Scrolle und tippe auf „Zum Home-Bildschirm“',
    iosStep3: 'Tippe zum Installieren auf „Hinzufügen“',
    installApp: 'App installieren',
    dontShowAgain: 'Nicht mehr anzeigen',
  },
  portalClose: {
    returningCountdown: 'Rückkehr zu GameBuddies in {countdown} Sekunden',
    returningEveryone: 'Alle kehren in die Lobby zurück...',
    returningToGameBuddies: 'Rückkehr zu GameBuddies...',
  },
  loadingScreen: {
    connecting: 'Verbinde',
    hint1: 'Mach dich bereit zum Spielen!',
    hint2: 'Hol deine Freunde dazu!',
    hint3: 'Gleich geht der Spaß los!',
    hint4: 'Großartiges Gameplay wird geladen...',
    hint5: 'Spielraum wird vorbereitet!',
    hint6: 'Fast geschafft!',
  },
  heartsGambit: {
    cardValue: 'Wert:',
  },
  gameAd: {
    support: 'GameBuddies unterstützen',
    helpKeepFree: 'Werbung hält die Spiele kostenlos!',
  },
  psDemo: {
    seenByLou: 'VON LOU GESEHEN',
    arrested: 'VERHAFTET',
    peek: 'SPICKEN',
    correctArrested: '✓ RICHTIG — VERHAFTET',
  },
  xp: {
    levelUp: 'LEVEL-UP!',
    xpGained: 'XP ERHALTEN',
    victory: '🏆 Sieg',
    played: '💪 Gespielt',
    dismiss: 'Benachrichtigung schließen',
    base: 'Basis',
    win: 'Sieg',
    length: 'Länge',
    streak: '{count} Serie',
    firstWin: 'Erster Sieg',
    xpBoost: '2× XP-Boost',
    lv: 'Lv',
    levelsGained: '+{count} Level!',
  },
  adminMessage: {
    title: 'Nachricht von GameBuddies',
    replySent: 'Antwort gesendet ✓',
    replyPlaceholder: 'An GameBuddies antworten…',
    sendReply: 'Antwort senden',
  },
  mute: {
    mute: 'Stummschalten',
    unmute: 'Stummschaltung aufheben',
    muteAudio: 'Spiel-Audio stummschalten',
    unmuteAudio: 'Spiel-Audio aktivieren',
  },
  shell: {
    collapseSidebar: 'Seitenleiste einklappen',
    showSidebar: 'Seitenleiste anzeigen',
    hideSidebar: 'Seitenleiste ausblenden',
  },
};
