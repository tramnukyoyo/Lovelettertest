/**
 * Socket Event Names
 * Centralized list of all socket events for easy reference
 */

export const SOCKET_EVENTS = {
  // ============================================================================
  // CORE EVENTS (handled by GameBuddiesGameServer)
  // ============================================================================

  // Room management
  ROOM_CREATE: 'room:create',
  ROOM_CREATED: 'room:created',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_LEAVE: 'room:leave',
  ROOM_CREATE_INVITE: 'room:create-invite',
  ROOM_INVITE_CREATED: 'room:invite-created',

  // Player events
  PLAYER_JOINED: 'player:joined',
  PLAYER_LEFT: 'player:left',
  PLAYER_DISCONNECTED: 'player:disconnected',
  PLAYER_RECONNECTED: 'player:reconnected',

  // Host events
  HOST_TRANSFERRED: 'host:transferred',

  // Chat events
  CHAT_MESSAGE: 'chat:message',
  CHAT_SEND: 'chat:send',

  // Error events
  ERROR: 'error',

  // Heartbeat events
  CLIENT_HEARTBEAT: 'client:heartbeat',
  CLIENT_PAGE_BACKGROUNDED: 'client:page-backgrounded',

  // GameBuddies return events
  GAMEBUDDIES_RETURN: 'gamebuddies:return',
  GAMEBUDDIES_RETURN_REDIRECT: 'gamebuddies:return-redirect',

  // WebRTC events
  WEBRTC_ENABLE_VIDEO: 'webrtc:enable-video',
  WEBRTC_DISABLE_VIDEO: 'webrtc:disable-video',
  WEBRTC_OFFER: 'webrtc:offer',
  WEBRTC_ANSWER: 'webrtc:answer',
  WEBRTC_ICE_CANDIDATE: 'webrtc:ice-candidate',
  WEBRTC_PEER_LEFT: 'webrtc:peer-left',

  // ============================================================================
  // GAME-SPECIFIC EVENTS (TODO: Add your game events here)
  // ============================================================================

  // Game setup
  GAME_SETUP: 'game:setup',
  GAME_SETUP_COMPLETE: 'game:setup-complete',

  // Game flow
  GAME_START: 'game:start',
  GAME_STARTED: 'game:started',
  GAME_END: 'game:end',
  GAME_ENDED: 'game:ended',
  GAME_RESTART: 'game:restart',
  GAME_RESTARTED: 'game:restarted',

  // State sync
  GAME_STATE_SYNC: 'game:state-sync',
  LOBBY_UPDATE: 'lobby:update',

  // TODO: Add your custom game events here
  // Example:
  // GAME_ACTION: 'game:action',
  // GAME_TURN_START: 'game:turn-start',
  // GAME_TURN_END: 'game:turn-end',
} as const;
