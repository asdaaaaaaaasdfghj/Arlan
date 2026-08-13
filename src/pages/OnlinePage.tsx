import type { RealtimeChannel, User } from '@supabase/supabase-js';
import type { CSSProperties } from 'react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'wouter';
import { GameBoard } from '../components/GameBoard';
import { GameControls } from '../components/GameControls';
import { GameHud } from '../components/GameHud';
import {
  changeWeapon,
  createInitialGame,
  emptyInput,
  startGame,
  tickGame,
  ARENA_HEIGHT,
  ARENA_WIDTH,
  type GameInput,
  type GameMode,
  type GameState,
  type MapId,
  type PlayerId,
  type PlayerInput,
  type WeaponId,
} from '../lib/arenaShooter';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { loadGameSettings } from '../lib/gameSettings';
import { useGameKeyboard } from '../lib/useGameKeyboard';
import { mapName, modeName, t } from '../lib/i18n';
import { modeOrder } from '../lib/arenaModes';
import { getMapObstacles, mapNames, mapOrder } from '../lib/arenaMap';
import { getKickReasonLabel, isProfileBanned, recordKick, type KickPayload, type KickReason } from '../lib/onlineBans';
import { loadGuestProfile, loadPlayerProfile, normalizePlayerProfile, type PlayerProfile, type PlayerSkinId } from '../lib/playerProfile';
import { getWeaponConfig } from '../lib/arenaWeapons';
import type { CustomBlockKind } from '../lib/customMap';
import './game.css';
import './online.css';

type OnlineRole = 'host' | 'guest';
type ConnectionStatus = 'idle' | 'connecting' | 'online';
type GuestSlot = 'red' | 'extra';
type OnlineRule = 'classic' | 'ffa' | 'sandbox' | 'murderMystery' | 'builderBattle' | 'zombieInfection';
type ChatMessage = {
  id: string;
  sender: OnlineRole;
  nickname: string;
  text: string;
  time: number;
};
type AdminAnnouncement = {
  text: string;
  id: number;
};
type EmoteId = 'wave' | 'laugh' | 'angry' | 'gg' | 'dance' | 'wow';
type PlayerEmote = {
  clientId: string;
  emote: EmoteId;
  createdAt: number;
};
type BuilderPhase = 'build' | 'vote' | 'results';
type OnlineModeState = {
  infectedIds: string[];
  eliminatedIds: string[];
  builderTheme: string;
  builderPhase: BuilderPhase;
  builderVotes: Record<string, number>;
};
type OnlineParticipant = {
  clientId: string;
  nickname: string;
  color: string;
  skin: PlayerSkinId;
  slot: 'host' | GuestSlot;
};
type OnlineServerListing = {
  code: string;
  name: string;
  mode: GameMode;
  mapId: MapId;
  onlineRule: OnlineRule;
  players: number;
  maxPlayers: number;
  official: boolean;
  seenAt: number;
};
type OnlineProfilePayload = {
  clientId: string;
  profile: PlayerProfile;
};
type ExtraPlayer = OnlineParticipant & {
  x: number;
  y: number;
  facingX: number;
  facingY: number;
};
type OnlineBullet = {
  id: string;
  ownerClientId: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
  size: number;
  createdAt: number;
};
type SandboxBlock = {
  id: string;
  col: number;
  row: number;
  kind: SandboxBlockKind;
};
type TargetedKickPayload = KickPayload & {
  targetClientId?: string;
};
type SandboxBlockKind = Extract<CustomBlockKind, 'wall' | 'stoneWall' | 'metalWall' | 'glassWall' | 'board' | 'luckyBlock' | 'grass' | 'water' | 'ice' | 'lava'>;
type RoleAssignment = {
  clientId: string;
  slot: GuestSlot;
  players: OnlineParticipant[];
  maxPlayers: number;
  onlineRule: OnlineRule;
};
type RoomBroadcastSettings = {
  maxPlayers: number;
  onlineRule: OnlineRule;
};
const kickReasons: KickReason[] = ['cheats', 'bugAbuse', 'toxic', 'chatSpam', 'other'];
const onlineRules: OnlineRule[] = ['classic', 'ffa', 'sandbox', 'murderMystery', 'builderBattle', 'zombieInfection'];
const sandboxGridSize = 50;
const sandboxCameraZoom = 1.35;
const antiCheatMaxExtraSpeed = 76;
const antiCheatMoveGrace = 9;
const antiCheatMinShotIntervalMs = 110;
const antiCheatKickThreshold = 3;
const sandboxBlockKinds: SandboxBlockKind[] = ['wall', 'stoneWall', 'metalWall', 'glassWall', 'board', 'luckyBlock', 'grass', 'water', 'ice', 'lava'];
const emotes: Array<{ id: EmoteId; label: string }> = [
  { id: 'wave', label: 'o/' },
  { id: 'laugh', label: 'LOL' },
  { id: 'angry', label: '!!' },
  { id: 'gg', label: 'GG' },
  { id: 'dance', label: '♪' },
  { id: 'wow', label: 'WOW' },
];
const emoteLifeMs = 2400;
const builderThemes = ['Castle', 'Space base', 'Monster', 'Secret bunker', 'Parkour tower', 'Volcano lab'];
const defaultModeState: OnlineModeState = {
  infectedIds: [],
  eliminatedIds: [],
  builderTheme: builderThemes[0],
  builderPhase: 'build',
  builderVotes: {},
};
const officialDuelArena = {
  code: 'DA32V5',
  name: 'Duel Arena Official',
  maxPlayers: 32,
  mode: 'endlessDuel',
  mapId: 'crossfire',
  rule: 'ffa',
} as const;
const officialSecretPortal = { x: 92, y: 12, radius: 4 };
const officialSecretRoom = { x: 10, y: 82, width: 28, height: 14, exitX: 35, exitY: 89 };

export function OnlinePage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<OnlineRole | null>(null);
  const [roomCode, setRoomCode] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [authReady, setAuthReady] = useState(false);
  const [serverMode, setServerMode] = useState(settings.defaultMode);
  const [serverMap, setServerMap] = useState(settings.defaultMap);
  const [serverName, setServerName] = useState('My Arena Server');
  const [serverMaxPlayers, setServerMaxPlayers] = useState(8);
  const [onlineRule, setOnlineRule] = useState<OnlineRule>('classic');
  const [sandboxBlockKind, setSandboxBlockKind] = useState<SandboxBlockKind>('wall');
  const [sandboxBlocks, setSandboxBlocks] = useState<SandboxBlock[]>([]);
  const [notice, setNotice] = useState('');
  const [guestSlot, setGuestSlot] = useState<GuestSlot>('extra');
  const [roomPlayers, setRoomPlayers] = useState<OnlineParticipant[]>([]);
  const [extraPlayers, setExtraPlayers] = useState<Record<string, ExtraPlayer>>({});
  const [kickReason, setKickReason] = useState<KickReason>('cheats');
  const [chatDraft, setChatDraft] = useState('');
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatHidden, setChatHidden] = useState(false);
  const [adminMessage, setAdminMessage] = useState('');
  const [adminAnnouncement, setAdminAnnouncement] = useState<AdminAnnouncement | null>(null);
  const [playerEmotes, setPlayerEmotes] = useState<Record<string, PlayerEmote>>({});
  const [onlineBullets, setOnlineBullets] = useState<OnlineBullet[]>([]);
  const [modeState, setModeState] = useState<OnlineModeState>(() => createModeState('classic'));
  const [officialPlayerCount, setOfficialPlayerCount] = useState(0);
  const [serverListings, setServerListings] = useState<OnlineServerListing[]>([]);
  const [playerProfiles, setPlayerProfiles] = useState<Partial<Record<PlayerId, PlayerProfile>>>({});
  const [game, setGame] = useState(() => createInitialGame(settings.defaultMode, settings.defaultMap));
  const gameRef = useRef(game);
  const roomPlayersRef = useRef<OnlineParticipant[]>([]);
  const extraPlayersRef = useRef<Record<string, ExtraPlayer>>({});
  const channelRef = useRef<RealtimeChannel | null>(null);
  const officialLobbyRef = useRef<RealtimeChannel | null>(null);
  const lobbyRef = useRef<RealtimeChannel | null>(null);
  const clientIdRef = useRef(makeClientId());
  const inputRef = useRef<GameInput>(cloneInput(emptyInput));
  const extraInputRef = useRef<PlayerInput>({ ...emptyInput.red });
  const extraWeaponRef = useRef<WeaponId>('blaster');
  const lastOnlineShotAtRef = useRef(0);
  const lastRemoteShotAtRef = useRef<Record<string, number>>({});
  const lastRemoteExtraRef = useRef<Record<string, { x: number; y: number; time: number }>>({});
  const antiCheatViolationsRef = useRef<Record<string, number>>({});
  const isOfficialRoom = roomCode === officialDuelArena.code;
  const activeOnlineRule = isOfficialRoom ? officialDuelArena.rule : onlineRule;
  const activeMaxPlayers = isOfficialRoom ? officialDuelArena.maxPlayers : serverMaxPlayers;
  const isGuestAccount = !user;

  useEffect(() => () => leaveRoom(), []);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    roomPlayersRef.current = roomPlayers;
  }, [roomPlayers]);

  useEffect(() => {
    extraPlayersRef.current = extraPlayers;
  }, [extraPlayers]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setAuthReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authReady || role || !isSupabaseConfigured) {
      return;
    }

    const code = getInviteRoomCode();
    if (!code) return;
    setJoinCode(code);
    joinRoomByCode(code);
  }, [authReady, role]);

  useEffect(() => {
    if (role || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase.channel(`arena-room-${officialDuelArena.code}`, { config: { broadcast: { self: false } } });
    officialLobbyRef.current = channel;
    channel.on('broadcast', { event: 'server-roster' }, ({ payload }) => {
      const roster = normalizeRoster(payload);
      setOfficialPlayerCount(roster.players.length);
    });
    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (officialLobbyRef.current === channel) {
        officialLobbyRef.current = null;
      }
    };
  }, [role]);

  useEffect(() => {
    if (role || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase.channel('arena-lobby', { config: { broadcast: { self: false } } });
    lobbyRef.current = channel;
    channel.on('broadcast', { event: 'server-listing' }, ({ payload }) => {
      const listing = normalizeServerListing(payload);
      if (!listing) return;
      setServerListings((current) => {
        const next = current.filter((server) => server.code !== listing.code);
        return [...next, listing].sort((a, b) => Number(b.official) - Number(a.official) || b.players - a.players);
      });
      if (listing.code === officialDuelArena.code) {
        setOfficialPlayerCount(listing.players);
      }
    });
    channel.subscribe();
    const pruneId = window.setInterval(() => {
      const now = Date.now();
      setServerListings((current) => current.filter((server) => now - server.seenAt < 7000));
    }, 2500);

    return () => {
      window.clearInterval(pruneId);
      supabase.removeChannel(channel);
      if (lobbyRef.current === channel) {
        lobbyRef.current = null;
      }
    };
  }, [role]);

  useEffect(() => {
    if (!adminAnnouncement) {
      return;
    }

    const timerId = window.setTimeout(() => setAdminAnnouncement(null), 3200);
    return () => window.clearTimeout(timerId);
  }, [adminAnnouncement]);

  useEffect(() => {
    const timerId = window.setInterval(() => {
      const now = Date.now();
      const collisionBlocks = getOnlineCollisionBlocks(activeOnlineRule, isOfficialRoom, sandboxBlocks);
      setPlayerEmotes((current) => Object.fromEntries(
        Object.entries(current).filter(([, emote]) => now - emote.createdAt < emoteLifeMs),
      ));
      setOnlineBullets((current) => current
        .map((bullet) => moveOnlineBullet(bullet))
        .filter((bullet) => (
          now - bullet.createdAt < 900
          && bullet.x > -5
          && bullet.x < 105
          && bullet.y > -5
          && bullet.y < 105
          && !isOnlineBulletBlocked(bullet, collisionBlocks)
        )));
    }, 1000 / 30);

    return () => window.clearInterval(timerId);
  }, [activeOnlineRule, isOfficialRoom, sandboxBlocks]);

  useEffect(() => {
    if (role !== 'host' || status !== 'online') {
      return;
    }

    const timerId = window.setInterval(() => {
      setGame((current) => {
        const collisionBlocks = getOnlineCollisionBlocks(activeOnlineRule, isOfficialRoom, sandboxBlocks);
        const moved = isFreeWorldRule(activeOnlineRule)
          ? tickSandboxHost(current, inputRef.current.blue, collisionBlocks, 1 / settings.gameFps)
          : tickGame(current, inputRef.current, 1 / settings.gameFps, settings.secretZombies);
        const next = isOfficialRoom ? moveOfficialPlayersThroughSecretRoom(moved) : moved;
        setModeState((mode) => {
          const updated = tickOnlineModeState(mode, activeOnlineRule, roomPlayers, extraPlayers, next);
          if (updated !== mode) {
            void sendBroadcast('mode-state', updated);
          }
          return updated;
        });
        void sendBroadcast('state', next);
        return next;
      });
    }, 1000 / settings.gameFps);

    return () => window.clearInterval(timerId);
  }, [activeOnlineRule, extraPlayers, isOfficialRoom, role, roomPlayers, sandboxBlocks, settings.gameFps, settings.secretZombies, status]);

  useEffect(() => {
    if (role !== 'host' || status !== 'online' || !isOfficialRoom) {
      return;
    }

    const broadcastRoster = () => {
      void sendBroadcast('server-roster', {
        players: roomPlayers,
        maxPlayers: officialDuelArena.maxPlayers,
        onlineRule: officialDuelArena.rule,
      });
    };
    broadcastRoster();
    const timerId = window.setInterval(broadcastRoster, 2200);
    return () => window.clearInterval(timerId);
  }, [isOfficialRoom, role, roomPlayers, status]);

  useEffect(() => {
    if (role !== 'host' || status !== 'online' || !isSupabaseConfigured) {
      return;
    }

    const channel = supabase.channel('arena-lobby-host', { config: { broadcast: { self: false } } });
    channel.subscribe((nextStatus) => {
      if (nextStatus === 'SUBSCRIBED') {
        void sendLobbyListing(channel);
      }
    });
    const timerId = window.setInterval(() => {
      void sendLobbyListing(channel);
    }, 2000);

    return () => {
      window.clearInterval(timerId);
      supabase.removeChannel(channel);
    };
  }, [activeOnlineRule, isOfficialRoom, role, roomCode, roomPlayers, serverMap, serverMaxPlayers, serverMode, serverName, status]);

  useEffect(() => {
    if (role !== 'guest' || guestSlot !== 'extra' || status !== 'online') {
      return;
    }

    const timerId = window.setInterval(() => {
      setExtraPlayers((current) => {
        const self = current[clientIdRef.current] ?? createExtraPlayer(clientIdRef.current, loadOnlineProfile(), 48, 34);
        const collisionBlocks = getOnlineCollisionBlocks(activeOnlineRule, isOfficialRoom, sandboxBlocks);
        const moved = moveExtraPlayer(self, extraInputRef.current, collisionBlocks, 1 / 30);
        const next = isOfficialRoom ? moveThroughOfficialSecretRoom(moved) : moved;
        void sendBroadcast('extra-player', next);
        return { ...current, [clientIdRef.current]: next };
      });
    }, 1000 / 30);

    return () => window.clearInterval(timerId);
  }, [activeOnlineRule, guestSlot, isOfficialRoom, role, sandboxBlocks, status]);

  useGameKeyboard({
    status: game.status,
    mapId: game.mapId,
    onRestart: () => onlineAction('restart'),
    onStart: () => onlineAction('start'),
    onPress: setPressed,
    onWeaponChange: setWeapon,
    controls: settings.controls,
  });

  function createRoom() {
    if (isGuestAccount && serverMap === 'custom') {
      setNotice(getGuestRestrictionText('customMap', language));
      return;
    }

    const code = makeRoomCode();
    const profile = loadOnlineProfile();
    setNotice('');
    setRoomCode(code);
    setRole('host');
    setGuestSlot('extra');
    setPlayerProfiles({ blue: profile });
    setRoomPlayers([createParticipant(clientIdRef.current, profile, 'host')]);
    setChatMessages([]);
    setPlayerEmotes({});
    setOnlineBullets([]);
    setModeState(createModeState(onlineRule));
    setSandboxBlocks([]);
    setGame(createOnlineInitialGame(serverMode, serverMap, onlineRule));
    connectChannel(code, 'host', { maxPlayers: serverMaxPlayers, onlineRule });
  }

  function enterOfficialDuelArena() {
    createOfficialDuelArena();
  }

  function createOfficialDuelArena() {
    if (isGuestAccount) {
      setNotice(getGuestRestrictionText('official', language));
      return;
    }

    const profile = loadOnlineProfile();
    setNotice('');
    setRoomCode(officialDuelArena.code);
    setRole('host');
    setGuestSlot('extra');
    setServerName(officialDuelArena.name);
    setServerMaxPlayers(officialDuelArena.maxPlayers);
    setServerMode(officialDuelArena.mode);
    setServerMap(officialDuelArena.mapId);
    setOnlineRule(officialDuelArena.rule);
    setPlayerProfiles({ blue: profile });
    setRoomPlayers([createParticipant(clientIdRef.current, profile, 'host')]);
    setChatMessages([]);
    setPlayerEmotes({});
    setOnlineBullets([]);
    setModeState(createModeState(officialDuelArena.rule));
    setSandboxBlocks([]);
    setGame(createOfficialInitialGame());
    connectChannel(officialDuelArena.code, 'host', {
      maxPlayers: officialDuelArena.maxPlayers,
      onlineRule: officialDuelArena.rule,
    });
  }

  function joinRoom() {
    const code = joinCode.trim().toUpperCase();
    joinRoomByCode(code);
  }

  function joinRoomByCode(code: string) {
    if (!code) return;
    if (isGuestAccount && code === officialDuelArena.code) {
      setNotice(getGuestRestrictionText('official', language));
      return;
    }

    setNotice('');
    setRoomCode(code);
    setRole('guest');
    setGuestSlot('extra');
    setPlayerProfiles({});
    setRoomPlayers([createParticipant(clientIdRef.current, loadOnlineProfile(), 'extra')]);
    setChatMessages([]);
    setPlayerEmotes({});
    setOnlineBullets([]);
    setModeState(createModeState('classic'));
    setSandboxBlocks([]);
    connectChannel(code, 'guest');
  }

  function connectChannel(code: string, nextRole: OnlineRole, roomSettings?: RoomBroadcastSettings) {
    if (!isSupabaseConfigured) return;
    leaveRoom();
    setStatus('connecting');
    const channel = supabase.channel(`arena-room-${code}`, { config: { broadcast: { self: false } } });
    channelRef.current = channel;
    channel.on('broadcast', { event: 'chat' }, ({ payload }) => {
      addChatMessage(normalizeChatMessage(payload));
    });
    channel.on('broadcast', { event: 'admin-message' }, ({ payload }) => {
      showAdminAnnouncement(normalizeAdminMessage(payload));
    });
    channel.on('broadcast', { event: 'emote' }, ({ payload }) => {
      showPlayerEmote(normalizePlayerEmote(payload));
    });
    channel.on('broadcast', { event: 'mode-state' }, ({ payload }) => {
      setModeState(normalizeModeState(payload));
    });
    channel.on('broadcast', { event: 'extra-player' }, ({ payload }) => {
      const extra = normalizeExtraPlayer(payload);
      if (!acceptRemoteExtraPlayer(extra, code)) return;
      setExtraPlayers((current) => ({ ...current, [extra.clientId]: extra }));
    });
    channel.on('broadcast', { event: 'online-shot' }, ({ payload }) => {
      const bullet = normalizeOnlineBullet(payload);
      if (bullet.ownerClientId === clientIdRef.current) return;
      if (!acceptRemoteShot(bullet)) return;
      addOnlineBullet(bullet);
    });
    channel.on('broadcast', { event: 'sandbox-block' }, ({ payload }) => {
      addSandboxBlock(normalizeSandboxBlock(payload));
    });
    channel.on('broadcast', { event: 'sandbox-remove-block' }, ({ payload }) => {
      removeSandboxBlock(normalizeSandboxBlockId(payload));
    });
    channel.on('broadcast', { event: 'sandbox-blocks' }, ({ payload }) => {
      setSandboxBlocks(normalizeSandboxBlocks(payload));
    });
    channel.on('broadcast', { event: 'nickname-taken' }, ({ payload }) => {
      if (normalizeTargetClientId(payload) !== clientIdRef.current) return;
      leaveRoom();
      setRole(null);
      setStatus('idle');
      setNotice(language === 'ru' ? 'Ник занят. Поменяй ник в профиле и зайди снова.' : 'Nickname is taken. Change your profile name and join again.');
    });
    channel.on('broadcast', { event: 'server-code-taken' }, ({ payload }) => {
      if (normalizeTargetClientId(payload) !== clientIdRef.current) return;
      leaveRoom();
      setRole(null);
      setStatus('idle');
      setNotice(language === 'ru' ? 'Этот код для сервера занят.' : 'This server code is already taken.');
    });

    if (nextRole === 'host') {
      channel.on('broadcast', { event: 'host-claim' }, ({ payload }) => {
        const targetClientId = normalizeTargetClientId(payload);
        if (!targetClientId || targetClientId === clientIdRef.current) return;
        void sendBroadcast('server-code-taken', { targetClientId });
        void sendBroadcast('server-roster', {
          players: roomPlayers,
          maxPlayers: roomSettings?.maxPlayers ?? serverMaxPlayers,
          onlineRule: roomSettings?.onlineRule ?? onlineRule,
        });
      });
      channel.on('broadcast', { event: 'guest-input' }, ({ payload }) => {
        inputRef.current = { ...inputRef.current, red: normalizeInput(payload) };
      });
      channel.on('broadcast', { event: 'guest-weapon' }, ({ payload }) => {
        const weapon = normalizeWeapon(payload);
        if (weapon) setGame((current) => changeWeapon(current, 'red', weapon));
      });
      channel.on('broadcast', { event: 'guest-action' }, ({ payload }) => {
        if (payload === 'start') setGame((current) => startGame(current));
        if (payload === 'restart') restartHostGame();
      });
      channel.on('broadcast', { event: 'guest-profile' }, ({ payload }) => {
        const guest = normalizeProfilePayload(payload);
        const profile = guest.profile;
        if (isProfileBanned(profile)) {
          void sendBroadcast('kick', { reason: 'banned', banned: true, targetClientId: guest.clientId } satisfies TargetedKickPayload);
          return;
        }

        assignGuestSlot(guest.clientId, profile);
        void sendBroadcast('host-profile', loadOnlineProfile());
      });
    } else {
      channel.on('broadcast', { event: 'state' }, ({ payload }) => {
        if (isGuestAccount && (payload as Partial<GameState>).mapId === 'custom') {
          leaveRoom();
          setRole(null);
          setStatus('idle');
          setNotice(getGuestRestrictionText('customMap', language));
          return;
        }

        const nextGame = payload as GameState;
        setGame(code === officialDuelArena.code ? { ...nextGame, mode: officialDuelArena.mode, mapId: officialDuelArena.mapId } : nextGame);
      });
      channel.on('broadcast', { event: 'host-profile' }, ({ payload }) => {
        setPlayerProfiles((current) => ({ ...current, blue: normalizePlayerProfile(payload) }));
      });
      channel.on('broadcast', { event: 'guest-role' }, ({ payload }) => {
        const assignment = normalizeRoleAssignment(payload);
        if (assignment.clientId !== clientIdRef.current) return;
        setGuestSlot(assignment.slot);
        setRoomPlayers(assignment.players);
        setOnlineRule(code === officialDuelArena.code ? officialDuelArena.rule : assignment.onlineRule);
        setPlayerProfiles((current) => (
          assignment.slot === 'red'
            ? { ...current, red: loadOnlineProfile() }
            : current
        ));
        if (assignment.slot === 'extra') {
          const extra = createExtraPlayer(clientIdRef.current, loadOnlineProfile(), 48, 34);
          setExtraPlayers((current) => ({ ...current, [clientIdRef.current]: extra }));
          void sendBroadcast('extra-player', extra);
        }
        setNotice(assignment.slot === 'red'
          ? language === 'ru' ? 'Ты красный игрок.' : 'You are the red player.'
          : language === 'ru' ? 'Ты extra-игрок. Можно бегать по арене и писать в чат.' : 'You are an extra player. You can run around and chat.');
      });
      channel.on('broadcast', { event: 'server-roster' }, ({ payload }) => {
        const roster = normalizeRoster(payload);
        setRoomPlayers(roster.players);
        setServerMaxPlayers(roster.maxPlayers);
        setOnlineRule(code === officialDuelArena.code ? officialDuelArena.rule : roster.onlineRule);
      });
      channel.on('broadcast', { event: 'room-full' }, ({ payload }) => {
        if (payload !== clientIdRef.current) return;
        leaveRoom();
        setRole(null);
        setStatus('idle');
        setNotice(language === 'ru' ? 'Сервер заполнен.' : 'Server is full.');
      });
      channel.on('broadcast', { event: 'kick' }, ({ payload }) => {
        const kick = normalizeKickPayload(payload);
        if (kick.targetClientId && kick.targetClientId !== clientIdRef.current) {
          return;
        }

        leaveRoom();
        setRole(null);
        setStatus('idle');
        setNotice(language === 'ru' ? 'Тебя кикнули с сервера.' : 'You were kicked from the server.');
      });
    }

    channel.subscribe((nextStatus) => {
      if (nextStatus === 'SUBSCRIBED') {
        setStatus('online');
        const profile = loadOnlineProfile();
        void sendBroadcast(nextRole === 'host' ? 'host-profile' : 'guest-profile', nextRole === 'host' ? profile : { clientId: clientIdRef.current, profile });
        if (nextRole === 'host') {
          void sendBroadcast('host-claim', clientIdRef.current);
          void sendBroadcast('server-roster', {
            players: [createParticipant(clientIdRef.current, profile, 'host')],
            maxPlayers: roomSettings?.maxPlayers ?? serverMaxPlayers,
            onlineRule: roomSettings?.onlineRule ?? onlineRule,
          });
        }
      }
    });
  }

  function leaveRoom() {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  }

  function setPressed(player: PlayerId, key: keyof PlayerInput, pressed: boolean) {
    const controlledPlayer = isFreeWorldRule(activeOnlineRule) && role === 'host' ? 'blue' : player;

    if (isBuildWorldRule(activeOnlineRule) && key === 'build' && pressed) {
      placeSandboxBlock(controlledPlayer);
    }

    if (role === 'host' && controlledPlayer === 'blue') {
      inputRef.current = { ...inputRef.current, blue: { ...inputRef.current.blue, [key]: pressed } };
    }

    if (role === 'guest' && guestSlot === 'red' && controlledPlayer === 'red') {
      const red = { ...inputRef.current.red, [key]: pressed };
      inputRef.current = { ...inputRef.current, red };
      void sendBroadcast('guest-input', red);
    }

    if (role === 'guest' && guestSlot === 'extra') {
      extraInputRef.current = { ...extraInputRef.current, [key]: pressed };
    }

    const canNudgeExtraInOfficial = isOfficialRoom && role === 'guest' && guestSlot === 'extra';
    if ((isFreeWorldRule(activeOnlineRule) || canNudgeExtraInOfficial) && pressed && isMoveKey(key)) {
      nudgeFreeWorldPlayer();
    }

    if ((isFreeWorldRule(activeOnlineRule) || canNudgeExtraInOfficial) && pressed && key === 'shoot') {
      fireOnlineShot();
    }
  }

  function nudgeFreeWorldPlayer() {
    const collisionBlocks = getOnlineCollisionBlocks(activeOnlineRule, isOfficialRoom, sandboxBlocks);

    if (role === 'host') {
      setGame((current) => {
        const moved = tickSandboxHost(current, inputRef.current.blue, collisionBlocks, 1 / 30);
        return isOfficialRoom ? moveHostThroughOfficialSecretRoom(moved) : moved;
      });
      return;
    }

    if (role === 'guest' && guestSlot === 'extra') {
      setExtraPlayers((current) => {
        const self = current[clientIdRef.current] ?? createExtraPlayer(clientIdRef.current, loadOnlineProfile(), 48, 34);
        const moved = moveExtraPlayer(self, extraInputRef.current, collisionBlocks, 1 / 30);
        const next = isOfficialRoom ? moveThroughOfficialSecretRoom(moved) : moved;
        void sendBroadcast('extra-player', next);
        return { ...current, [clientIdRef.current]: next };
      });
    }
  }

  function setWeapon(player: PlayerId, weapon: WeaponId) {
    const controlledPlayer = isFreeWorldRule(activeOnlineRule) && role === 'host' ? 'blue' : player;

    if (role === 'host' && controlledPlayer === 'blue') {
      setGame((current) => changeWeapon(current, 'blue', weapon));
    }

    if (role === 'guest' && guestSlot === 'extra') {
      extraWeaponRef.current = weapon;
    }

    if (role === 'guest' && guestSlot === 'red' && controlledPlayer === 'red') {
      void sendBroadcast('guest-weapon', weapon);
    }
  }

  function fireOnlineShot() {
    const shot = createOnlineShot();
    if (!shot) return;
    addOnlineBullet(shot);
    void sendBroadcast('online-shot', shot);
  }

  function fireOnlineShotAtPointer(event: React.MouseEvent<HTMLDivElement>) {
    if (!isFreeWorldRule(activeOnlineRule)) return;
    const target = getSandboxWorldPointFromPointer(event);
    const shot = createOnlineShot(target);
    if (!shot) return;
    addOnlineBullet(shot);
    void sendBroadcast('online-shot', shot);
  }

  function addOnlineBullet(bullet: OnlineBullet) {
    setOnlineBullets((current) => [...current.slice(-80), bullet]);
  }

  function createOnlineShot(target?: { x: number; y: number }): OnlineBullet | null {
    const now = Date.now();
    const weapon = role === 'host' ? game.players.blue.weapon : extraWeaponRef.current;
    const config = getOnlineWeaponConfig(weapon);
    if (now - lastOnlineShotAtRef.current < config.cooldown * 1000) {
      return null;
    }

    const shooter = getOnlineShooterPosition(role, guestSlot, game, extraPlayers, clientIdRef.current);
    if (!shooter) return null;
    lastOnlineShotAtRef.current = now;

    const direction = target
      ? getDirectionToPoint(shooter, target)
      : getOnlineShotDirection(role, inputRef.current.blue, extraInputRef.current, game, extraPlayers, clientIdRef.current);
    return {
      id: `${clientIdRef.current}-${now}-${Math.random().toString(36).slice(2)}`,
      ownerClientId: clientIdRef.current,
      x: shooter.x + direction.dx * 3,
      y: shooter.y + direction.dy * 3,
      dx: direction.dx,
      dy: direction.dy,
      color: shooter.color,
      size: config.size,
      createdAt: now,
    };
  }

  function onlineAction(action: 'start' | 'restart') {
    if (role === 'host') {
      action === 'start' ? setGame((current) => startGame(current)) : restartHostGame();
      return;
    }

    if (guestSlot === 'red') {
      void sendBroadcast('guest-action', action);
    }
  }

  function restartHostGame() {
    inputRef.current = cloneInput(emptyInput);
    setGame((current) => ({ ...createInitialGame(current.mode, current.mapId), status: 'playing' }));
  }

  function applyServerSettings() {
    if (role !== 'host') return;
    inputRef.current = cloneInput(emptyInput);
    const nextMode = isOfficialRoom ? officialDuelArena.mode : serverMode;
    const nextMap = isOfficialRoom ? officialDuelArena.mapId : serverMap;
    const nextRule = isOfficialRoom ? officialDuelArena.rule : onlineRule;
    const nextMaxPlayers = isOfficialRoom ? officialDuelArena.maxPlayers : serverMaxPlayers;
    const next = isOfficialRoom ? createOfficialInitialGame() : createOnlineInitialGame(nextMode, nextMap, nextRule);
    const nextModeState = createModeState(nextRule);
    setModeState(nextModeState);
    setGame(next);
    void sendBroadcast('state', next);
    void sendBroadcast('mode-state', nextModeState);
    void sendBroadcast('server-roster', { players: roomPlayers, maxPlayers: nextMaxPlayers, onlineRule: nextRule });
  }

  function assignGuestSlot(clientId: string, profile: PlayerProfile) {
    setRoomPlayers((current) => {
      if (current.some((player) => player.clientId === clientId)) {
        return current;
      }

      if (isNicknameTaken(profile.nickname, current, clientId)) {
        void sendBroadcast('nickname-taken', { targetClientId: clientId });
        return current;
      }

      const maxPlayers = isOfficialRoom ? officialDuelArena.maxPlayers : serverMaxPlayers;
      const rule = isOfficialRoom ? officialDuelArena.rule : onlineRule;
      if (current.length >= maxPlayers) {
        void sendBroadcast('room-full', clientId);
        return current;
      }

      const slot: GuestSlot = needsRedPlayer(rule) && !current.some((player) => player.slot === 'red') ? 'red' : 'extra';
      const next = [...current, createParticipant(clientId, profile, slot)];
      if (slot === 'red') {
        setPlayerProfiles((profiles) => ({ ...profiles, red: profile }));
      }

      const nextModeState = syncModeStateForPlayers(modeState, rule, next);
      setModeState(nextModeState);
      void sendBroadcast('guest-role', { clientId, slot, players: next, maxPlayers, onlineRule: rule } satisfies RoleAssignment);
      void sendBroadcast('server-roster', { players: next, maxPlayers, onlineRule: rule });
      void sendBroadcast('mode-state', nextModeState);
      void sendBroadcast('sandbox-blocks', sandboxBlocks);
      return next;
    });
  }

  function kickGuest() {
    if (role !== 'host') return;
    const redPlayer = roomPlayers.find((player) => player.slot === 'red');
    if (!redPlayer) {
      setNotice(language === 'ru' ? 'Красного игрока нет.' : 'No red player.');
      return;
    }

    kickParticipant(redPlayer, kickReason);
  }

  function kickParticipant(player: OnlineParticipant, reason: KickReason) {
    if (player.slot === 'host') return;
    const profile = { nickname: player.nickname, color: player.color, skin: player.skin };
    const kick = recordKick(profile, reason);
    inputRef.current = { ...inputRef.current, red: { ...emptyInput.red } };
    if (player.slot === 'red') {
      setPlayerProfiles((current) => ({ blue: current.blue }));
    }
    setExtraPlayers((current) => {
      const next = { ...current };
      delete next[player.clientId];
      return next;
    });
    setRoomPlayers((current) => {
      const next = current.filter((item) => item.clientId !== player.clientId);
      void sendBroadcast('server-roster', { players: next, maxPlayers: serverMaxPlayers, onlineRule });
      return next;
    });
    setNotice(getHostKickNotice(profile, kick, language));
    void sendBroadcast('kick', { ...kick, targetClientId: player.clientId } satisfies TargetedKickPayload);
  }

  function acceptRemoteExtraPlayer(extra: ExtraPlayer, code: string): boolean {
    const now = Date.now();
    const previous = lastRemoteExtraRef.current[extra.clientId];
    lastRemoteExtraRef.current = {
      ...lastRemoteExtraRef.current,
      [extra.clientId]: { x: extra.x, y: extra.y, time: now },
    };

    if (!previous) return true;
    if (code === officialDuelArena.code && isAllowedOfficialTeleport(previous, extra)) return true;

    const elapsed = Math.max(0.08, (now - previous.time) / 1000);
    const distance = Math.hypot(extra.x - previous.x, extra.y - previous.y);
    const allowed = antiCheatMaxExtraSpeed * elapsed + antiCheatMoveGrace;
    if (distance <= allowed) return true;

    recordAntiCheatViolation(extra.clientId, 'speed');
    return false;
  }

  function acceptRemoteShot(bullet: OnlineBullet): boolean {
    const now = Date.now();
    const lastShotAt = lastRemoteShotAtRef.current[bullet.ownerClientId] ?? 0;
    lastRemoteShotAtRef.current = { ...lastRemoteShotAtRef.current, [bullet.ownerClientId]: now };

    if (now - lastShotAt < antiCheatMinShotIntervalMs || !isOnlineShotNearOwner(bullet)) {
      recordAntiCheatViolation(bullet.ownerClientId, 'shot');
      return false;
    }

    return true;
  }

  function isOnlineShotNearOwner(bullet: OnlineBullet): boolean {
    const owner = roomPlayersRef.current.find((item) => item.clientId === bullet.ownerClientId);
    if (!owner) return false;

    if (owner.slot === 'host') {
      const player = gameRef.current.players.blue;
      return Math.hypot(bullet.x - (player.x / ARENA_WIDTH) * 100, bullet.y - (player.y / ARENA_HEIGHT) * 100) < 9;
    }

    if (owner.slot === 'red') {
      const player = gameRef.current.players.red;
      return Math.hypot(bullet.x - (player.x / ARENA_WIDTH) * 100, bullet.y - (player.y / ARENA_HEIGHT) * 100) < 9;
    }

    const extra = extraPlayersRef.current[owner.clientId];
    return extra ? Math.hypot(bullet.x - extra.x, bullet.y - extra.y) < 9 : false;
  }

  function recordAntiCheatViolation(clientId: string, reason: 'speed' | 'shot') {
    const count = (antiCheatViolationsRef.current[clientId] ?? 0) + 1;
    antiCheatViolationsRef.current = { ...antiCheatViolationsRef.current, [clientId]: count };
    if (role !== 'host' || count < antiCheatKickThreshold) return;

    const player = roomPlayersRef.current.find((item) => item.clientId === clientId);
    if (!player || player.slot === 'host') return;
    setNotice(language === 'ru'
      ? `Античит кикнул ${player.nickname}: ${reason === 'speed' ? 'слишком быстрое движение' : 'подозрительные выстрелы'}.`
      : `Anti-cheat kicked ${player.nickname}: ${reason === 'speed' ? 'impossible movement' : 'suspicious shooting'}.`);
    kickParticipant(player, 'cheats');
  }

  function sendChatMessage() {
    if (!role) return;
    if (isGuestAccount) {
      setNotice(getGuestRestrictionText('chat', language));
      return;
    }

    const text = chatDraft.trim().slice(0, 120);
    if (!text) return;
    if (role === 'host' && runKickCommand(text)) {
      setChatDraft('');
      return;
    }

    const ownProfile = role === 'host' ? playerProfiles.blue : guestSlot === 'red' ? playerProfiles.red : loadOnlineProfile();
    const message: ChatMessage = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      sender: role,
      nickname: ownProfile?.nickname ?? (role === 'host' ? 'Blue' : 'Red'),
      text,
      time: Date.now(),
    };

    addChatMessage(message);
    setChatDraft('');
    void sendBroadcast('chat', message);
  }

  function runKickCommand(text: string): boolean {
    const command = parseKickCommand(text);
    if (!command) return false;

    const target = roomPlayers.find((player) => (
      player.slot !== 'host' && normalizeNickname(player.nickname) === normalizeNickname(command.nickname)
    ));
    if (!target) {
      setNotice(language === 'ru' ? `Игрок ${command.nickname} не найден.` : `Player ${command.nickname} not found.`);
      return true;
    }

    kickParticipant(target, command.reason);
    return true;
  }

  function addChatMessage(message: ChatMessage) {
    if (!message.text.trim()) return;
    setChatMessages((current) => [...current.slice(-29), message]);
  }

  function placeSandboxBlock(player: PlayerId) {
    if (role !== 'host' && guestSlot !== 'extra') return;
    const position = getSandboxBuildPosition(player);
    if (!position) return;
    const block: SandboxBlock = {
      id: `${position.col}:${position.row}`,
      col: position.col,
      row: position.row,
      kind: sandboxBlockKind,
    };

    addSandboxBlock(block);
    void sendBroadcast('sandbox-block', block);
  }

  function placeSandboxBlockAt(col: number, row: number) {
    if (!isBuildWorldRule(activeOnlineRule) || !role) return;
    const block: SandboxBlock = {
      id: `${col}:${row}`,
      col: clampInt(col, 0, sandboxGridSize - 1),
      row: clampInt(row, 0, sandboxGridSize - 1),
      kind: sandboxBlockKind,
    };

    addSandboxBlock(block);
    void sendBroadcast('sandbox-block', block);
  }

  function placeSandboxBlockAtPointer(event: React.MouseEvent<HTMLDivElement>) {
    const cell = getSandboxCellFromPointer(event);
    placeSandboxBlockAt(cell.col, cell.row);
  }

  function removeSandboxBlockAtPointer(event: React.MouseEvent<HTMLDivElement>) {
    const cell = getSandboxCellFromPointer(event);
    const id = `${cell.col}:${cell.row}`;
    removeSandboxBlock(id);
    void sendBroadcast('sandbox-remove-block', id);
  }

  function getSandboxCellFromPointer(event: React.MouseEvent<HTMLDivElement>): Pick<SandboxBlock, 'col' | 'row'> {
    return positionToSandboxCellFromPoint(getSandboxWorldPointFromPointer(event));
  }

  function getSandboxWorldPointFromPointer(event: React.MouseEvent<HTMLDivElement>): { x: number; y: number } {
    const rect = event.currentTarget.getBoundingClientRect();
    const focus = getSandboxFocus(role, guestSlot, game, extraPlayers, clientIdRef.current);
    const zoom = sandboxCameraZoom;
    const viewX = ((event.clientX - rect.left) / rect.width) * 100;
    const viewY = ((event.clientY - rect.top) / rect.height) * 100;
    const worldX = (viewX - 50) / zoom + focus.x;
    const worldY = (viewY - 50) / zoom + focus.y;
    return { x: clampNumber(worldX, 0, 100), y: clampNumber(worldY, 0, 100) };
  }

  function getSandboxBuildPosition(player: PlayerId): Pick<SandboxBlock, 'col' | 'row'> | null {
    if (role === 'host') {
      const fighter = game.players[player === 'red' ? 'red' : 'blue'];
      return positionToSandboxCell((fighter.x / ARENA_WIDTH) * 100, (fighter.y / ARENA_HEIGHT) * 100);
    }

    const extra = extraPlayers[clientIdRef.current];
    return extra ? positionToSandboxCell(extra.x, extra.y) : null;
  }

  function addSandboxBlock(block: SandboxBlock) {
    setSandboxBlocks((current) => [
      ...current.filter((item) => item.id !== block.id),
      block,
    ].slice(-900));
  }

  function removeSandboxBlock(id: string) {
    setSandboxBlocks((current) => current.filter((block) => block.id !== id));
  }

  function fireAdminNuke() {
    if (role !== 'host') return;
    setGame((current) => {
      const next = applyAdminNuke(current);
      void sendBroadcast('state', next);
      return next;
    });
    showAdminAnnouncement(language === 'ru' ? 'ADMIN NUKE' : 'ADMIN NUKE');
    void sendBroadcast('admin-message', language === 'ru' ? 'ADMIN NUKE' : 'ADMIN NUKE');
  }

  function fireAdminEmp() {
    if (role !== 'host') return;
    setGame((current) => {
      const next = applyAdminEmp(current);
      void sendBroadcast('state', next);
      return next;
    });
    showAdminAnnouncement(language === 'ru' ? 'EMP: красный оглушён' : 'EMP: red stunned');
    void sendBroadcast('admin-message', language === 'ru' ? 'EMP: красный оглушён' : 'EMP: red stunned');
  }

  function sendAdminMessage() {
    if (role !== 'host') return;
    const text = adminMessage.trim().slice(0, 48);
    if (!text) return;
    setAdminMessage('');
    showAdminAnnouncement(text);
    void sendBroadcast('admin-message', text);
  }

  function sendEmote(emote: EmoteId) {
    const payload: PlayerEmote = {
      clientId: clientIdRef.current,
      emote,
      createdAt: Date.now(),
    };
    showPlayerEmote(payload);
    void sendBroadcast('emote', payload);
  }

  function showPlayerEmote(emote: PlayerEmote) {
    setPlayerEmotes((current) => ({
      ...current,
      [emote.clientId]: emote,
    }));
  }

  function nextBuilderPhase() {
    if (role !== 'host' || onlineRule !== 'builderBattle') return;
    const next = {
      ...modeState,
      builderPhase: getNextBuilderPhase(modeState.builderPhase),
      builderVotes: modeState.builderPhase === 'results' ? {} : modeState.builderVotes,
      builderTheme: modeState.builderPhase === 'results' ? pickBuilderTheme() : modeState.builderTheme,
    };
    setModeState(next);
    void sendBroadcast('mode-state', next);
  }

  function voteBuilder() {
    if (onlineRule !== 'builderBattle' || modeState.builderPhase !== 'vote') return;
    const next = {
      ...modeState,
      builderVotes: {
        ...modeState.builderVotes,
        [clientIdRef.current]: (modeState.builderVotes[clientIdRef.current] ?? 0) + 1,
      },
    };
    setModeState(next);
    void sendBroadcast('mode-state', next);
  }

  function showAdminAnnouncement(text: string) {
    const cleanText = text.trim().slice(0, 48);
    if (!cleanText) return;
    setAdminAnnouncement({ text: cleanText, id: Date.now() });
  }

  async function sendBroadcast(event: string, payload: unknown) {
    await channelRef.current?.send({ type: 'broadcast', event, payload });
  }

  async function copyInviteLink() {
    if (!roomCode) return;
    const link = makeInviteLink(roomCode);
    try {
      await navigator.clipboard.writeText(link);
      setNotice('Invite link copied.');
    } catch {
      setNotice(link);
    }
  }

  async function sendLobbyListing(channel: RealtimeChannel) {
    if (!roomCode) return;
    const maxPlayers = isOfficialRoom ? officialDuelArena.maxPlayers : serverMaxPlayers;
    await channel.send({
      type: 'broadcast',
      event: 'server-listing',
      payload: {
        code: roomCode,
        name: isOfficialRoom ? officialDuelArena.name : serverName,
        mode: isOfficialRoom ? officialDuelArena.mode : serverMode,
        mapId: isOfficialRoom ? officialDuelArena.mapId : serverMap,
        onlineRule: activeOnlineRule,
        players: roomPlayers.length,
        maxPlayers,
        official: isOfficialRoom,
        seenAt: Date.now(),
      } satisfies OnlineServerListing,
    });
  }

  function loadOnlineProfile(): PlayerProfile {
    return isGuestAccount ? loadGuestProfile() : loadPlayerProfile();
  }

  return (
    <main className="game-page online-page">
      <nav className="game-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <strong>{language === 'ru' ? 'Онлайн серверы' : 'Online servers'}</strong>
        <span className="online-account-badge">{isGuestAccount ? (language === 'ru' ? 'Гость' : 'Guest') : (language === 'ru' ? 'Аккаунт' : 'Account')}</span>
      </nav>
      {isGuestAccount && (
        <p className="online-panel online-guest-panel">
          {language === 'ru'
            ? 'Гостевой режим: можно играть на обычных серверах, но нельзя official, чат и создание custom-карт.'
            : 'Guest mode: you can play normal servers, but official servers, chat, and custom map creation are locked.'}
        </p>
      )}
      {!isSupabaseConfigured && <p className="online-panel">{language === 'ru' ? 'Supabase не настроен, онлайн не запустится.' : 'Supabase is not configured, online cannot start.'}</p>}
      {!role && isSupabaseConfigured && (
        <>
        <section className="online-panel online-official-panel">
          <div>
            <small>{language === 'ru' ? 'Официальный сервер' : 'Official server'}</small>
            <strong>{officialDuelArena.name}</strong>
            <span>{language === 'ru' ? 'Duel Arena · Crossfire · Crossfire arena · 32 игрока' : 'Duel Arena · Crossfire · Crossfire arena · 32 players'}</span>
          </div>
          <b className="online-official-count">{officialPlayerCount}/{officialDuelArena.maxPlayers}</b>
          <button type="button" disabled={isGuestAccount} onClick={enterOfficialDuelArena}>{language === 'ru' ? 'Зайти на DA32V5' : 'Join DA32V5'}</button>
        </section>
        <section className="online-panel online-server-list">
          <strong>{language === 'ru' ? 'Живые серверы' : 'Live servers'}</strong>
          {serverListings.length === 0 ? (
            <span>{language === 'ru' ? 'Пока нет активных комнат. Создай свою или открой DA32V5.' : 'No live rooms yet. Create one or open DA32V5.'}</span>
          ) : (
            <div>
              {serverListings.map((server) => (
                <button type="button" className="online-server-card" disabled={isGuestAccount && server.official} onClick={() => joinRoomByCode(server.code)} key={server.code}>
                  <b>{server.name}</b>
                  <span>{server.code} · {getOnlineRuleLabel(server.onlineRule, language)} · {modeName(server.mode, language)}</span>
                  <small>{server.players}/{server.maxPlayers}</small>
                </button>
              ))}
            </div>
          )}
        </section>
        <section className="online-panel">
          <label>
            {language === 'ru' ? 'Название сервака' : 'Server name'}
            <input value={serverName} maxLength={28} onChange={(event) => setServerName(event.target.value)} />
          </label>
          <label>
            {t(language, 'mode')}
            <select value={serverMode} onChange={(event) => setServerMode(event.target.value as typeof serverMode)}>
              {modeOrder.map((mode) => (
                <option value={mode} key={mode}>{modeName(mode, language)}</option>
              ))}
            </select>
          </label>
          <label>
            {language === 'ru' ? 'Онлайн режим' : 'Online mode'}
            <select value={onlineRule} onChange={(event) => setOnlineRule(event.target.value as OnlineRule)}>
              {onlineRules.map((rule) => (
                <option value={rule} key={rule}>{getOnlineRuleLabel(rule, language)}</option>
              ))}
            </select>
          </label>
          <label>
            {t(language, 'map')}
            <select value={serverMap} onChange={(event) => setServerMap(event.target.value as typeof serverMap)}>
              {mapOrder.map((mapId) => (
                <option value={mapId} disabled={isGuestAccount && mapId === 'custom'} key={mapId}>{mapName(mapId, mapNames[mapId], language)}</option>
              ))}
            </select>
          </label>
          <button type="button" onClick={createRoom}>{language === 'ru' ? 'Создать комнату' : 'Create room'}</button>
          <label>
            {language === 'ru' ? 'Код комнаты' : 'Room code'}
            <input className="room-code-input" value={joinCode} maxLength={6} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
          </label>
          <label>
            {language === 'ru' ? 'Макс игроков' : 'Max players'}
            <input type="number" min="2" max="16" value={serverMaxPlayers} onChange={(event) => setServerMaxPlayers(clampInt(Number(event.target.value), 2, 16))} />
          </label>
          <button type="button" className="ghost-button" onClick={joinRoom}>{language === 'ru' ? 'Подключиться' : 'Join'}</button>
        </section>
        </>
      )}
      {notice && <p className="online-panel">{notice}</p>}
      {role && (
        <>
          <section className="online-status">
            <span>{role === 'host' ? 'Blue host' : guestSlot === 'red' ? 'Red guest' : 'Extra player'}</span>
            <strong>{roomCode}</strong>
            <button type="button" onClick={copyInviteLink}>Copy invite</button>
            <span>{getOnlineRuleLabel(activeOnlineRule, language)} · {status} · {roomPlayers.length}/{activeMaxPlayers}</span>
          </section>
          <section className="online-panel online-roster-panel">
            <strong>{language === 'ru' ? 'Игроки сервера' : 'Server players'}</strong>
            <div>
              {roomPlayers.map((player) => (
                <span className={`online-player-chip chip-${player.slot}`} key={player.clientId} style={{ '--player-chip-color': player.color } as CSSProperties}>
                  {player.nickname}
                  <small>{getSlotLabel(player.slot, language)}</small>
                </span>
              ))}
            </div>
          </section>
          {isBuildWorldRule(activeOnlineRule) && (
            <section className="online-panel online-sandbox-panel">
              <strong>{activeOnlineRule === 'builderBattle' ? 'Builder Battle 50x50' : 'Sandbox 50x50'}</strong>
              <label>
                {language === 'ru' ? 'Блок для строительства' : 'Build block'}
                <select value={sandboxBlockKind} onChange={(event) => setSandboxBlockKind(event.target.value as SandboxBlockKind)}>
                  {sandboxBlockKinds.map((kind) => (
                    <option value={kind} key={kind}>{getSandboxBlockLabel(kind)}</option>
                  ))}
                </select>
              </label>
              <span>{language === 'ru' ? 'Жми кнопку строительства, чтобы поставить блок под собой.' : 'Press build to place a block under yourself.'}</span>
            </section>
          )}
          {!isBuildWorldRule(activeOnlineRule) && activeOnlineRule !== 'classic' && (
            <section className="online-panel online-rule-panel">
              <strong>{getOnlineRuleLabel(activeOnlineRule, language)}</strong>
              <span>{getModeStatusText(activeOnlineRule, modeState, roomPlayers, clientIdRef.current, language)}</span>
            </section>
          )}
          {activeOnlineRule === 'builderBattle' && (
            <section className="online-panel online-builder-panel">
              <strong>{language === 'ru' ? `Тема: ${modeState.builderTheme}` : `Theme: ${modeState.builderTheme}`}</strong>
              <span>{getBuilderPhaseText(modeState.builderPhase, language)}</span>
              {role === 'host' && <button type="button" onClick={nextBuilderPhase}>{language === 'ru' ? 'Следующая фаза' : 'Next phase'}</button>}
              {modeState.builderPhase === 'vote' && <button type="button" onClick={voteBuilder}>{language === 'ru' ? 'Голос +1' : 'Vote +1'}</button>}
            </section>
          )}
          {role === 'host' && (
            <section className="online-panel online-server-panel">
              <strong>{serverName}</strong>
              <label>
                {t(language, 'mode')}
                <select value={serverMode} onChange={(event) => setServerMode(event.target.value as typeof serverMode)}>
                  {modeOrder.map((mode) => (
                    <option value={mode} key={mode}>{modeName(mode, language)}</option>
                  ))}
                </select>
              </label>
              <label>
                {language === 'ru' ? 'Онлайн режим' : 'Online mode'}
                <select value={onlineRule} onChange={(event) => setOnlineRule(event.target.value as OnlineRule)}>
                  {onlineRules.map((rule) => (
                    <option value={rule} key={rule}>{getOnlineRuleLabel(rule, language)}</option>
                  ))}
                </select>
              </label>
              <label>
                {t(language, 'map')}
                <select value={serverMap} onChange={(event) => setServerMap(event.target.value as typeof serverMap)}>
                  {mapOrder.map((mapId) => (
                    <option value={mapId} disabled={isGuestAccount && mapId === 'custom'} key={mapId}>{mapName(mapId, mapNames[mapId], language)}</option>
                  ))}
                </select>
              </label>
              <button type="button" onClick={applyServerSettings}>{language === 'ru' ? 'Применить настройки' : 'Apply settings'}</button>
              <button type="button" className="danger-button" onClick={kickGuest}>{language === 'ru' ? 'Кикнуть красного' : 'Kick red player'}</button>
            </section>
          )}
          {role === 'host' && (
            <section className="online-panel online-ban-panel">
              <label>
                {language === 'ru' ? 'Причина кика' : 'Kick reason'}
                <select value={kickReason} onChange={(event) => setKickReason(event.target.value as KickReason)}>
                  {kickReasons.map((reason) => (
                    <option value={reason} key={reason}>{getKickReasonLabel(reason, language)}</option>
                  ))}
                </select>
              </label>
              <span>{language === 'ru' ? '3 серьёзных кика = бан. ADMINlol не банится.' : '3 serious kicks = ban. ADMINlol cannot be banned.'}</span>
            </section>
          )}
          {role === 'host' && (
            <section className="online-panel online-admin-panel">
              <strong>{language === 'ru' ? 'Админ оружие' : 'Admin weapons'}</strong>
              <button type="button" className="danger-button" onClick={fireAdminNuke}>{language === 'ru' ? 'Ядерка' : 'Nuke'}</button>
              <button type="button" onClick={fireAdminEmp}>EMP</button>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  sendAdminMessage();
                }}
              >
                <input
                  value={adminMessage}
                  maxLength={48}
                  placeholder={language === 'ru' ? 'Сообщение на весь экран' : 'Fullscreen message'}
                  onChange={(event) => setAdminMessage(event.target.value)}
                />
                <button type="submit">{language === 'ru' ? 'Показать' : 'Show'}</button>
              </form>
            </section>
          )}
          <section className="online-emote-panel" aria-label={language === 'ru' ? 'Эмоции' : 'Emotes'}>
            {emotes.map((emote) => (
              <button type="button" onClick={() => sendEmote(emote.id)} key={emote.id}>
                {emote.label}
              </button>
            ))}
          </section>
          <GameHud game={game} language={language} />
          <div className="online-arena-shell" onPointerDown={blurTypingTarget}>
            {isFreeWorldRule(activeOnlineRule) ? (
              <div
                className={`online-sandbox-arena ${isBuildWorldRule(activeOnlineRule) ? '' : 'online-free-arena'}`}
                onPointerDown={blurTypingTarget}
                onClick={isBuildWorldRule(activeOnlineRule) ? placeSandboxBlockAtPointer : fireOnlineShotAtPointer}
                onContextMenu={(event) => {
                  event.preventDefault();
                  if (isBuildWorldRule(activeOnlineRule)) {
                    removeSandboxBlockAtPointer(event);
                  }
                }}
              >
                <div className="online-sandbox-world" style={getSandboxCameraStyle(role, guestSlot, game, extraPlayers, clientIdRef.current)}>
                  {!isBuildWorldRule(activeOnlineRule) && <FreeWorldLandmarks officialRoom={isOfficialRoom} />}
                  {isBuildWorldRule(activeOnlineRule) && (
                    <div className="online-sandbox-grid" aria-hidden="true">
                      {sandboxBlocks.map((block) => (
                        <span
                          className={`online-sandbox-block ${block.kind}-cell`}
                          key={block.id}
                          style={{
                            gridColumn: block.col + 1,
                            gridRow: block.row + 1,
                          }}
                        />
                      ))}
                    </div>
                  )}
                  {isOfficialRoom && <OfficialSecretRoom active={Object.values(extraPlayers).some(isInsideOfficialSecretRoom)} />}
                  <SandboxAvatar
                    color={playerProfiles.blue?.color ?? '#3a86ff'}
                    skin={playerProfiles.blue?.skin ?? 'none'}
                    nickname={playerProfiles.blue?.nickname ?? 'Blue'}
                    badge={getParticipantBadge('host', roomPlayers, modeState, onlineRule)}
                    x={(game.players.blue.x / ARENA_WIDTH) * 100}
                    y={(game.players.blue.y / ARENA_HEIGHT) * 100}
                  />
                  {Object.values(extraPlayers).map((player) => (
                    <SandboxAvatar
                      color={player.color}
                      skin={player.skin}
                      badge={getOnlinePlayerBadge(player, roomPlayers, modeState, onlineRule, isOfficialRoom)}
                      key={player.clientId}
                      nickname={player.nickname}
                      x={player.x}
                      y={player.y}
                    />
                  ))}
                  {onlineBullets.map((bullet) => (
                    <span
                      className="online-world-bullet"
                      key={bullet.id}
                      style={{
                        '--online-bullet-color': bullet.color,
                        left: `${bullet.x}%`,
                        top: `${bullet.y}%`,
                        width: `${bullet.size}px`,
                        height: `${bullet.size}px`,
                      } as CSSProperties}
                    />
                  ))}
                  {Object.values(playerEmotes).map((emote) => {
                    const position = getEmotePosition(emote, roomPlayers, extraPlayers, game);
                    return position ? <PlayerEmoteBubble emote={emote} position={position} key={emote.clientId} /> : null;
                  })}
                </div>
                <OnlinePositionReadout position={getSandboxFocus(role, guestSlot, game, extraPlayers, clientIdRef.current)} />
              </div>
            ) : (
              <>
                <GameBoard game={game} language={language} playerProfiles={playerProfiles} playerEmotes={getFighterEmoteLabels(playerEmotes, roomPlayers)} />
                {isOfficialRoom && <OfficialSecretRoom active={isOfficialSecretActive(game, extraPlayers)} />}
                {Object.values(extraPlayers).map((player) => (
                  <SandboxAvatar
                    color={player.color}
                    skin={player.skin}
                    badge={getOnlinePlayerBadge(player, roomPlayers, modeState, onlineRule, isOfficialRoom)}
                    key={player.clientId}
                    nickname={player.nickname}
                    x={player.x}
                    y={player.y}
                  />
                ))}
                {Object.values(playerEmotes).map((emote) => {
                  const position = getExtraEmotePosition(emote, roomPlayers, extraPlayers);
                  return position ? <PlayerEmoteBubble emote={emote} position={position} key={emote.clientId} /> : null;
                })}
              </>
            )}
            {adminAnnouncement && (
              <div className="online-admin-announcement" key={adminAnnouncement.id}>
                {adminAnnouncement.text}
              </div>
            )}
            <section className={`online-chat-panel ${chatHidden ? 'online-chat-hidden' : ''}`}>
              <button type="button" className="online-chat-toggle" onClick={() => setChatHidden((current) => !current)}>
                {chatHidden ? (language === 'ru' ? 'Показать чат' : 'Show chat') : (language === 'ru' ? 'Скрыть чат' : 'Hide chat')}
              </button>
              {!chatHidden && (
                <>
                  <div className="online-chat-log">
                    {chatMessages.length === 0 && <span className="online-chat-empty">{language === 'ru' ? 'Пока тихо...' : 'Quiet so far...'}</span>}
                    {chatMessages.map((message) => (
                      <p className={`online-chat-message chat-${message.sender}`} key={message.id}>
                        <b>{message.nickname}</b>
                        <span>{message.text}</span>
                      </p>
                    ))}
                  </div>
                  <form
                    className="online-chat-form"
                    onSubmit={(event) => {
                      event.preventDefault();
                      sendChatMessage();
                    }}
                  >
                    <input
                      value={chatDraft}
                      maxLength={120}
                      disabled={isGuestAccount}
                      placeholder={language === 'ru' ? 'Написать...' : 'Type...'}
                      onChange={(event) => setChatDraft(event.target.value)}
                    />
                    <button type="submit" disabled={isGuestAccount}>{language === 'ru' ? 'Отправить' : 'Send'}</button>
                  </form>
                </>
              )}
            </section>
          </div>
          <GameControls game={game} showTouchControls={settings.touchControls} language={language} onAction={() => onlineAction(game.status === 'ready' ? 'start' : 'restart')} onPress={setPressed} onWeaponChange={setWeapon} />
        </>
      )}
    </main>
  );
}

function makeRoomCode(): string {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

function makeClientId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getInviteRoomCode(): string {
  const hashQuery = window.location.hash.split('?')[1] ?? '';
  const query = hashQuery || window.location.search.slice(1);
  const code = new URLSearchParams(query).get('room') ?? '';
  return code.trim().toUpperCase().slice(0, 8);
}

function makeInviteLink(code: string): string {
  return `${window.location.origin}${window.location.pathname}#/online?room=${encodeURIComponent(code)}`;
}

function createParticipant(clientId: string, profile: PlayerProfile, slot: OnlineParticipant['slot']): OnlineParticipant {
  return {
    clientId,
    nickname: profile.nickname,
    color: profile.color,
    skin: profile.skin,
    slot,
  };
}

function createOnlineInitialGame(mode: Parameters<typeof createInitialGame>[0], mapId: Parameters<typeof createInitialGame>[1], rule: OnlineRule): GameState {
  const gameMode = getGameModeForOnlineRule(mode, rule);
  const game = createInitialGame(gameMode, mapId);
  return rule === 'ffa' || isBuildWorldRule(rule) ? { ...game, status: 'playing', timeLeft: 999 } : game;
}

function createOfficialInitialGame(): GameState {
  return {
    ...createInitialGame(officialDuelArena.mode, officialDuelArena.mapId),
    status: 'playing',
  };
}

function getGameModeForOnlineRule(mode: Parameters<typeof createInitialGame>[0], rule: OnlineRule): Parameters<typeof createInitialGame>[0] {
  if (isBuildWorldRule(rule) || rule === 'ffa' || rule === 'murderMystery' || rule === 'zombieInfection') return 'endlessDuel';
  return mode;
}

function createExtraPlayer(clientId: string, profile: PlayerProfile, x: number, y: number): ExtraPlayer {
  return {
    ...createParticipant(clientId, profile, 'extra'),
    x,
    y,
    facingX: 1,
    facingY: 0,
  };
}

function moveExtraPlayer(player: ExtraPlayer, input: PlayerInput, blocks: SandboxBlock[], delta: number): ExtraPlayer {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(dx, dy) || 1;
  const speed = 32;
  const nextX = clampNumber(player.x + (dx / length) * speed * delta, 3, 97);
  const nextY = clampNumber(player.y + (dy / length) * speed * delta, 5, 95);
  const x = isSandboxBlocked(nextX, player.y, blocks) ? player.x : nextX;
  const y = isSandboxBlocked(x, nextY, blocks) ? player.y : nextY;

  return {
    ...player,
    x,
    y,
    facingX: dx !== 0 || dy !== 0 ? dx / length : player.facingX,
    facingY: dx !== 0 || dy !== 0 ? dy / length : player.facingY,
  };
}

function moveThroughOfficialSecretRoom(player: ExtraPlayer): ExtraPlayer {
  const nearPortal = Math.hypot(player.x - officialSecretPortal.x, player.y - officialSecretPortal.y) <= officialSecretPortal.radius;
  if (nearPortal) {
    return { ...player, x: officialSecretRoom.x + officialSecretRoom.width / 2, y: officialSecretRoom.y + officialSecretRoom.height / 2 };
  }

  const nearExit = Math.hypot(player.x - officialSecretRoom.exitX, player.y - officialSecretRoom.exitY) <= 4;
  return nearExit ? { ...player, x: 82, y: 18 } : player;
}

function moveHostThroughOfficialSecretRoom(state: GameState): GameState {
  const player = state.players.blue;
  const position = moveThroughOfficialSecretRoom(createExtraPlayer('host', {
    nickname: 'Blue',
    color: '#3a86ff',
    skin: 'none',
  }, (player.x / ARENA_WIDTH) * 100, (player.y / ARENA_HEIGHT) * 100));

  return {
    ...state,
    players: {
      ...state.players,
      blue: {
        ...player,
        x: (position.x / 100) * ARENA_WIDTH,
        y: (position.y / 100) * ARENA_HEIGHT,
      },
    },
  };
}

function moveOfficialPlayersThroughSecretRoom(state: GameState): GameState {
  const blueMoved = moveHostThroughOfficialSecretRoom(state);
  return {
    ...blueMoved,
    players: {
      ...blueMoved.players,
      red: moveGamePlayerThroughOfficialSecretRoom(state.players.red),
    },
  };
}

function moveGamePlayerThroughOfficialSecretRoom(player: GameState['players'][PlayerId]): GameState['players'][PlayerId] {
  const moved = moveThroughOfficialSecretRoom(createExtraPlayer(player.id, {
    nickname: player.id,
    color: player.id === 'blue' ? '#3a86ff' : '#ef476f',
    skin: 'none',
  }, (player.x / ARENA_WIDTH) * 100, (player.y / ARENA_HEIGHT) * 100));

  return {
    ...player,
    x: (moved.x / 100) * ARENA_WIDTH,
    y: (moved.y / 100) * ARENA_HEIGHT,
  };
}

function isOfficialSecretActive(game: GameState, extras: Record<string, ExtraPlayer>): boolean {
  const blue = { x: (game.players.blue.x / ARENA_WIDTH) * 100, y: (game.players.blue.y / ARENA_HEIGHT) * 100 };
  const red = { x: (game.players.red.x / ARENA_WIDTH) * 100, y: (game.players.red.y / ARENA_HEIGHT) * 100 };
  return isInsideOfficialSecretRoom(blue) || isInsideOfficialSecretRoom(red) || Object.values(extras).some(isInsideOfficialSecretRoom);
}

function getOnlineWeaponConfig(weapon: WeaponId) {
  return getWeaponConfig(weapon, 'open');
}

function getOnlineShooterPosition(
  role: OnlineRole | null,
  slot: GuestSlot,
  game: GameState,
  extras: Record<string, ExtraPlayer>,
  clientId: string,
): { x: number; y: number; color: string } | null {
  if (role === 'host') {
    return {
      x: (game.players.blue.x / ARENA_WIDTH) * 100,
      y: (game.players.blue.y / ARENA_HEIGHT) * 100,
      color: '#3a86ff',
    };
  }

  if (slot === 'extra') {
    const player = extras[clientId];
    return player ? { x: player.x, y: player.y, color: player.color } : null;
  }

  return null;
}

function getOnlineShotDirection(
  role: OnlineRole | null,
  hostInput: PlayerInput,
  extraInput: PlayerInput,
  game: GameState,
  extras: Record<string, ExtraPlayer>,
  clientId: string,
): { dx: number; dy: number } {
  const input = role === 'host' ? hostInput : extraInput;
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  const length = Math.hypot(dx, dy);
  if (length > 0) {
    return { dx: dx / length, dy: dy / length };
  }

  if (role === 'host') {
    const player = game.players.blue;
    const facingLength = Math.hypot(player.facingX, player.facingY) || 1;
    return { dx: player.facingX / facingLength, dy: player.facingY / facingLength };
  }

  const extra = extras[clientId];
  if (!extra) return { dx: 1, dy: 0 };
  const facingLength = Math.hypot(extra.facingX, extra.facingY) || 1;
  return { dx: extra.facingX / facingLength, dy: extra.facingY / facingLength };
}

function getDirectionToPoint(from: { x: number; y: number }, to: { x: number; y: number }): { dx: number; dy: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  return { dx: dx / length, dy: dy / length };
}

function OfficialSecretRoom({ active }: { active: boolean }) {
  return (
    <>
      <span className="official-secret-portal" style={{ left: `${officialSecretPortal.x}%`, top: `${officialSecretPortal.y}%` }} />
      <section
        className={`official-secret-room ${active ? 'active' : ''}`}
        style={{
          left: `${officialSecretRoom.x}%`,
          top: `${officialSecretRoom.y}%`,
          width: `${officialSecretRoom.width}%`,
          height: `${officialSecretRoom.height}%`,
        }}
      >
        <strong>ADMINlol ROOM</strong>
        <span>SECRET</span>
        <i style={{ left: `${((officialSecretRoom.exitX - officialSecretRoom.x) / officialSecretRoom.width) * 100}%`, top: `${((officialSecretRoom.exitY - officialSecretRoom.y) / officialSecretRoom.height) * 100}%` }} />
      </section>
    </>
  );
}

function FreeWorldLandmarks({ officialRoom }: { officialRoom: boolean }) {
  return (
    <div className="online-free-world-bg" aria-hidden="true">
      {officialRoom && getMapObstacles(officialDuelArena.mapId).map((wall) => (
        <i
          className="online-official-wall"
          key={wall.id}
          style={{
            left: `${(wall.x / ARENA_WIDTH) * 100}%`,
            top: `${(wall.y / ARENA_HEIGHT) * 100}%`,
            width: `${(wall.width / ARENA_WIDTH) * 100}%`,
            height: `${(wall.height / ARENA_HEIGHT) * 100}%`,
          }}
        />
      ))}
      {officialRoom && <b className="online-secret-pointer" style={{ left: '92%', top: '12%' }}>?</b>}
    </div>
  );
}

function OnlinePositionReadout({ position }: { position: { x: number; y: number } }) {
  return (
    <div className="online-position-readout">
      X {Math.round(position.x)} · Y {Math.round(position.y)}
    </div>
  );
}

function tickSandboxHost(state: GameState, input: PlayerInput, blocks: SandboxBlock[], delta: number): GameState {
  const player = state.players.blue;
  const percentX = (player.x / ARENA_WIDTH) * 100;
  const percentY = (player.y / ARENA_HEIGHT) * 100;
  const moved = moveExtraPlayer(createExtraPlayer('host', { nickname: 'Blue', color: '#3a86ff', skin: 'none' }, percentX, percentY), input, blocks, delta);

  return {
    ...state,
    status: 'playing',
    timeLeft: 999,
    players: {
      ...state.players,
      blue: {
        ...player,
        x: (moved.x / 100) * ARENA_WIDTH,
        y: (moved.y / 100) * ARENA_HEIGHT,
        facingX: input.left || input.right ? (input.right ? 1 : -1) : player.facingX,
        facingY: input.up || input.down ? (input.down ? 1 : -1) : player.facingY,
      },
    },
  };
}

function isSandboxBlocked(x: number, y: number, blocks: SandboxBlock[]): boolean {
  const cell = positionToSandboxCell(x, y);
  return blocks.some((block) => block.col === cell.col && block.row === cell.row && isSolidSandboxBlock(block.kind));
}

function moveOnlineBullet(bullet: OnlineBullet): OnlineBullet {
  return {
    ...bullet,
    x: bullet.x + bullet.dx * 2.9,
    y: bullet.y + bullet.dy * 2.9,
  };
}

function isOnlineBulletBlocked(bullet: OnlineBullet, blocks: SandboxBlock[]): boolean {
  if (blocks.length === 0) return false;
  return isSandboxBlocked(bullet.x, bullet.y, blocks);
}

function getOnlineCollisionBlocks(rule: OnlineRule, officialRoom: boolean, blocks: SandboxBlock[]): SandboxBlock[] {
  if (isBuildWorldRule(rule)) return blocks;
  return officialRoom ? getOfficialWallBlocks() : [];
}

function getOfficialWallBlocks(): SandboxBlock[] {
  return getMapObstacles(officialDuelArena.mapId).flatMap((wall) => {
    const start = positionToSandboxCell((wall.x / ARENA_WIDTH) * 100, (wall.y / ARENA_HEIGHT) * 100);
    const end = positionToSandboxCell(((wall.x + wall.width) / ARENA_WIDTH) * 100, ((wall.y + wall.height) / ARENA_HEIGHT) * 100);
    const blocks: SandboxBlock[] = [];
    for (let row = start.row; row <= end.row; row += 1) {
      for (let col = start.col; col <= end.col; col += 1) {
        blocks.push({ id: `official-${wall.id}-${col}-${row}`, col, row, kind: 'stoneWall' });
      }
    }
    return blocks;
  });
}

function isSolidSandboxBlock(kind: SandboxBlockKind): boolean {
  return kind === 'wall' || kind === 'stoneWall' || kind === 'metalWall' || kind === 'glassWall' || kind === 'board' || kind === 'luckyBlock';
}

function normalizeExtraPlayer(value: unknown): ExtraPlayer {
  const player = value as Partial<ExtraPlayer>;
  const participant = normalizeParticipants([player])[0] ?? createParticipant(makeClientId(), { nickname: 'Player', color: '#8fc9ff', skin: 'none' }, 'extra');
  const facingX = clampNumber(Number(player.facingX), -1, 1);
  const facingY = clampNumber(Number(player.facingY), -1, 1);
  const facingLength = Math.hypot(facingX, facingY) || 1;
  return {
    ...participant,
    slot: 'extra',
    x: clampNumber(Number(player.x), 3, 97),
    y: clampNumber(Number(player.y), 5, 95),
    facingX: facingX / facingLength,
    facingY: facingY / facingLength,
  };
}

function normalizeOnlineBullet(value: unknown): OnlineBullet {
  const bullet = value as Partial<OnlineBullet>;
  const dx = clampNumber(Number(bullet.dx), -1, 1);
  const dy = clampNumber(Number(bullet.dy), -1, 1);
  const length = Math.hypot(dx, dy) || 1;
  return {
    id: typeof bullet.id === 'string' ? bullet.id.slice(0, 100) : `${Date.now()}`,
    ownerClientId: typeof bullet.ownerClientId === 'string' ? bullet.ownerClientId.slice(0, 80) : '',
    x: clampNumber(Number(bullet.x), -5, 105),
    y: clampNumber(Number(bullet.y), -5, 105),
    dx: dx / length,
    dy: dy / length,
    color: typeof bullet.color === 'string' ? bullet.color.slice(0, 18) : '#ffffff',
    size: clampNumber(Number(bullet.size), 5, 18),
    createdAt: Number.isFinite(bullet.createdAt) ? Number(bullet.createdAt) : Date.now(),
  };
}

function positionToSandboxCell(xPercent: number, yPercent: number): Pick<SandboxBlock, 'col' | 'row'> {
  return {
    col: clampInt(Math.floor((xPercent / 100) * sandboxGridSize), 0, sandboxGridSize - 1),
    row: clampInt(Math.floor((yPercent / 100) * sandboxGridSize), 0, sandboxGridSize - 1),
  };
}

function positionToSandboxCellFromPoint(point: { x: number; y: number }): Pick<SandboxBlock, 'col' | 'row'> {
  return positionToSandboxCell(point.x, point.y);
}

function normalizeSandboxBlock(value: unknown): SandboxBlock {
  const block = value as Partial<SandboxBlock>;
  const col = clampInt(Number(block.col), 0, sandboxGridSize - 1);
  const row = clampInt(Number(block.row), 0, sandboxGridSize - 1);
  return {
    id: `${col}:${row}`,
    col,
    row,
    kind: normalizeSandboxBlockKind(block.kind),
  };
}

function normalizeSandboxBlocks(value: unknown): SandboxBlock[] {
  return Array.isArray(value) ? value.slice(0, 900).map(normalizeSandboxBlock) : [];
}

function normalizeSandboxBlockId(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }

  const [col, row] = value.split(':').map((part) => clampInt(Number(part), 0, sandboxGridSize - 1));
  return `${col}:${row}`;
}

function normalizeSandboxBlockKind(value: unknown): SandboxBlockKind {
  return sandboxBlockKinds.includes(value as SandboxBlockKind) ? value as SandboxBlockKind : 'wall';
}

function getSandboxBlockLabel(kind: SandboxBlockKind): string {
  const labels: Record<SandboxBlockKind, string> = {
    wall: 'Wall',
    stoneWall: 'Stone',
    metalWall: 'Metal',
    glassWall: 'Glass',
    board: 'Board',
    luckyBlock: 'Lucky',
    grass: 'Grass',
    water: 'Water',
    ice: 'Ice',
    lava: 'Lava',
  };

  return labels[kind];
}

function normalizeProfilePayload(value: unknown): OnlineProfilePayload {
  const payload = value as Partial<OnlineProfilePayload>;
  return {
    clientId: typeof payload.clientId === 'string' ? payload.clientId.slice(0, 80) : makeClientId(),
    profile: normalizePlayerProfile(payload.profile),
  };
}

function normalizeRoleAssignment(value: unknown): RoleAssignment {
  const payload = value as Partial<RoleAssignment>;
  return {
    clientId: typeof payload.clientId === 'string' ? payload.clientId : '',
    slot: payload.slot === 'red' ? 'red' : 'extra',
    players: normalizeParticipants(payload.players),
    maxPlayers: clampInt(Number(payload.maxPlayers), 2, 32),
    onlineRule: normalizeOnlineRule(payload.onlineRule),
  };
}

function normalizeRoster(value: unknown): Pick<RoleAssignment, 'players' | 'maxPlayers' | 'onlineRule'> {
  const payload = value as Partial<RoleAssignment>;
  return {
    players: normalizeParticipants(payload.players),
    maxPlayers: clampInt(Number(payload.maxPlayers), 2, 32),
    onlineRule: normalizeOnlineRule(payload.onlineRule),
  };
}

function normalizeServerListing(value: unknown): OnlineServerListing | null {
  const payload = value as Partial<OnlineServerListing>;
  if (typeof payload.code !== 'string' || typeof payload.name !== 'string') {
    return null;
  }

  const mode: GameMode = modeOrder.includes(payload.mode as (typeof modeOrder)[number]) ? payload.mode as GameMode : 'duel';
  const mapId: MapId = mapOrder.includes(payload.mapId as (typeof mapOrder)[number]) ? payload.mapId as MapId : 'crossfire';
  return {
    code: payload.code.trim().toUpperCase().slice(0, 8),
    name: payload.name.trim().slice(0, 28) || 'Arena server',
    mode,
    mapId,
    onlineRule: normalizeOnlineRule(payload.onlineRule),
    players: clampInt(Number(payload.players), 0, 32),
    maxPlayers: clampInt(Number(payload.maxPlayers), 2, 32),
    official: payload.official === true,
    seenAt: Date.now(),
  };
}

function normalizeParticipants(value: unknown): OnlineParticipant[] {
  return Array.isArray(value)
    ? value.slice(0, 32).flatMap((item): OnlineParticipant[] => {
      const participant = item as Partial<OnlineParticipant>;
      if (typeof participant.clientId !== 'string' || typeof participant.nickname !== 'string') {
        return [];
      }

      return [{
        clientId: participant.clientId.slice(0, 80),
        nickname: participant.nickname.trim().slice(0, 16) || 'Player',
        color: typeof participant.color === 'string' ? participant.color : '#8fc9ff',
        skin: normalizePlayerProfile({ skin: participant.skin }).skin,
        slot: participant.slot === 'host' || participant.slot === 'red' ? participant.slot : 'extra',
      }];
    })
    : [];
}

function getSlotLabel(slot: OnlineParticipant['slot'], language: 'ru' | 'en'): string {
  if (slot === 'host') return language === 'ru' ? 'хост' : 'host';
  if (slot === 'red') return language === 'ru' ? 'игрок' : 'player';
  return language === 'ru' ? 'extra' : 'extra';
}

function getOnlineRuleLabel(rule: OnlineRule, language: 'ru' | 'en'): string {
  const labels: Record<OnlineRule, { ru: string; en: string }> = {
    classic: { ru: 'Классика 2 игрока', en: 'Classic 2 players' },
    ffa: { ru: 'Все против всех', en: 'Free for all' },
    sandbox: { ru: 'Sandbox', en: 'Sandbox' },
    murderMystery: { ru: 'Murder Mystery', en: 'Murder Mystery' },
    builderBattle: { ru: 'Битва строителей', en: 'Builder Battle' },
    zombieInfection: { ru: 'Зомби заражение', en: 'Zombie Infection' },
  };

  return labels[rule][language];
}

function getOnlineRuleHint(rule: OnlineRule, language: 'ru' | 'en'): string {
  const hints: Partial<Record<OnlineRule, { ru: string; en: string }>> = {
    ffa: {
      ru: 'Открытая онлайн-арена без таймера. Игроки заходят как бойцы или extra-участники.',
      en: 'Open online arena without a timer. Players join as fighters or extra participants.',
    },
    murderMystery: {
      ru: 'Первый гость становится убийцей. Матч запускается как быстрый опасный раунд.',
      en: 'First guest becomes the murderer. The match runs as a fast dangerous round.',
    },
    zombieInfection: {
      ru: 'Арена запускается с зомби. Первый гость помогает/мешает как красный игрок.',
      en: 'The arena runs zombie mode. First guest joins as the red player.',
    },
  };

  return hints[rule]?.[language] ?? '';
}

function getGuestRestrictionText(kind: 'official' | 'chat' | 'customMap', language: 'ru' | 'en'): string {
  const text: Record<typeof kind, { ru: string; en: string }> = {
    official: {
      ru: 'Официальные серверы доступны только после входа в аккаунт.',
      en: 'Official servers are only available after signing in.',
    },
    chat: {
      ru: 'Гости не могут писать в чат. Войди в аккаунт, чтобы писать.',
      en: 'Guests cannot write in chat. Sign in to chat.',
    },
    customMap: {
      ru: 'Гости не могут создавать или выбирать custom-карты.',
      en: 'Guests cannot create or choose custom maps.',
    },
  };
  return text[kind][language];
}

function createModeState(rule: OnlineRule): OnlineModeState {
  return {
    ...defaultModeState,
    builderTheme: rule === 'builderBattle' ? pickBuilderTheme() : defaultModeState.builderTheme,
  };
}

function syncModeStateForPlayers(state: OnlineModeState, rule: OnlineRule, players: OnlineParticipant[]): OnlineModeState {
  if (rule === 'zombieInfection') {
    const firstZombie = players.find((player) => player.slot === 'red') ?? players[0];
    return firstZombie && state.infectedIds.length === 0
      ? { ...state, infectedIds: [firstZombie.clientId] }
      : state;
  }

  if (rule === 'murderMystery') {
    return { ...state, eliminatedIds: state.eliminatedIds.filter((id) => players.some((player) => player.clientId === id)) };
  }

  return state;
}

function tickOnlineModeState(
  state: OnlineModeState,
  rule: OnlineRule,
  players: OnlineParticipant[],
  extras: Record<string, ExtraPlayer>,
  game: GameState,
): OnlineModeState {
  if (rule === 'zombieInfection') {
    return tickZombieInfection(state, players, extras, game);
  }

  if (rule === 'murderMystery') {
    return tickMurderMystery(state, players, extras, game);
  }

  return state;
}

function tickZombieInfection(state: OnlineModeState, players: OnlineParticipant[], extras: Record<string, ExtraPlayer>, game: GameState): OnlineModeState {
  const infected = new Set(state.infectedIds);
  const positions = getParticipantPositions(players, extras, game);
  positions.forEach((position) => {
    if (!infected.has(position.clientId)) return;
    positions.forEach((target) => {
      if (infected.has(target.clientId) || Math.hypot(position.x - target.x, position.y - target.y) > 6) return;
      infected.add(target.clientId);
    });
  });
  const infectedIds = [...infected];
  return infectedIds.length === state.infectedIds.length ? state : { ...state, infectedIds };
}

function tickMurderMystery(state: OnlineModeState, players: OnlineParticipant[], extras: Record<string, ExtraPlayer>, game: GameState): OnlineModeState {
  const murderer = players.find((player) => player.slot === 'red');
  if (!murderer) return state;
  const eliminated = new Set(state.eliminatedIds);
  const redBullets = game.bullets.filter((bullet) => bullet.owner === 'red');
  Object.values(extras).forEach((extra) => {
    if (eliminated.has(extra.clientId)) return;
    const hit = redBullets.some((bullet) => Math.hypot((bullet.x / ARENA_WIDTH) * 100 - extra.x, (bullet.y / ARENA_HEIGHT) * 100 - extra.y) < 4);
    if (hit) eliminated.add(extra.clientId);
  });
  const eliminatedIds = [...eliminated];
  return eliminatedIds.length === state.eliminatedIds.length ? state : { ...state, eliminatedIds };
}

function getParticipantPositions(players: OnlineParticipant[], extras: Record<string, ExtraPlayer>, game: GameState) {
  return players.flatMap((player) => {
    if (player.slot === 'host') return [{ clientId: player.clientId, x: (game.players.blue.x / ARENA_WIDTH) * 100, y: (game.players.blue.y / ARENA_HEIGHT) * 100 }];
    if (player.slot === 'red') return [{ clientId: player.clientId, x: (game.players.red.x / ARENA_WIDTH) * 100, y: (game.players.red.y / ARENA_HEIGHT) * 100 }];
    const extra = extras[player.clientId];
    return extra ? [{ clientId: player.clientId, x: extra.x, y: extra.y }] : [];
  });
}

function getParticipantBadge(clientId: string, players: OnlineParticipant[], state: OnlineModeState, rule: OnlineRule): string {
  const player = players.find((item) => item.clientId === clientId || (clientId === 'host' && item.slot === 'host'));
  if (!player) return '';
  if (rule === 'murderMystery') {
    if (state.eliminatedIds.includes(player.clientId)) return 'DEAD';
    if (player.slot === 'red') return 'MURDERER';
    if (player.slot === 'host') return 'SHERIFF';
    return 'INNOCENT';
  }
  if (rule === 'zombieInfection') {
    return state.infectedIds.includes(player.clientId) ? 'ZOMBIE' : 'SURVIVOR';
  }
  return '';
}

function getOnlinePlayerBadge(player: ExtraPlayer, players: OnlineParticipant[], state: OnlineModeState, rule: OnlineRule, officialRoom: boolean): string {
  if (officialRoom && isInsideOfficialSecretRoom(player)) {
    return 'SECRET';
  }

  return getParticipantBadge(player.clientId, players, state, rule);
}

function isInsideOfficialSecretRoom(player: Pick<ExtraPlayer, 'x' | 'y'>): boolean {
  return player.x >= officialSecretRoom.x
    && player.x <= officialSecretRoom.x + officialSecretRoom.width
    && player.y >= officialSecretRoom.y
    && player.y <= officialSecretRoom.y + officialSecretRoom.height;
}

function isAllowedOfficialTeleport(previous: { x: number; y: number }, next: Pick<ExtraPlayer, 'x' | 'y'>): boolean {
  const enteredRoom = isNearPoint(previous, officialSecretPortal.x, officialSecretPortal.y, officialSecretPortal.radius + 1) && isInsideOfficialSecretRoom(next);
  const leftRoom = isInsideOfficialSecretRoom(previous) && isNearPoint(next, 82, 18, 5);
  return enteredRoom || leftRoom;
}

function isNearPoint(point: { x: number; y: number }, x: number, y: number, radius: number): boolean {
  return Math.hypot(point.x - x, point.y - y) <= radius;
}

function getModeStatusText(rule: OnlineRule, state: OnlineModeState, players: OnlineParticipant[], selfId: string, language: 'ru' | 'en'): string {
  if (rule === 'murderMystery') {
    const badge = getParticipantBadge(selfId, players, state, rule);
    return language === 'ru' ? `Твоя роль: ${badge || 'ожидание игроков'}` : `Your role: ${badge || 'waiting for players'}`;
  }
  if (rule === 'zombieInfection') {
    return language === 'ru'
      ? `Заражено: ${state.infectedIds.length}/${Math.max(1, players.length)}`
      : `Infected: ${state.infectedIds.length}/${Math.max(1, players.length)}`;
  }
  return getOnlineRuleHint(rule, language);
}

function getBuilderPhaseText(phase: BuilderPhase, language: 'ru' | 'en'): string {
  const labels: Record<BuilderPhase, { ru: string; en: string }> = {
    build: { ru: 'Фаза строительства: стройте постройку на тему.', en: 'Build phase: create something for the theme.' },
    vote: { ru: 'Фаза оценки: голосуйте за постройки.', en: 'Voting phase: rate the builds.' },
    results: { ru: 'Результаты. Хост может начать новую тему.', en: 'Results. Host can start a new theme.' },
  };
  return labels[phase][language];
}

function getNextBuilderPhase(phase: BuilderPhase): BuilderPhase {
  if (phase === 'build') return 'vote';
  if (phase === 'vote') return 'results';
  return 'build';
}

function pickBuilderTheme(): string {
  return builderThemes[Math.floor(Math.random() * builderThemes.length)];
}

function normalizeOnlineRule(value: unknown): OnlineRule {
  return onlineRules.includes(value as OnlineRule) ? value as OnlineRule : 'classic';
}

function normalizeModeState(value: unknown): OnlineModeState {
  const state = value as Partial<OnlineModeState>;
  return {
    infectedIds: normalizeIdList(state.infectedIds),
    eliminatedIds: normalizeIdList(state.eliminatedIds),
    builderTheme: typeof state.builderTheme === 'string' && state.builderTheme.trim() ? state.builderTheme.slice(0, 28) : defaultModeState.builderTheme,
    builderPhase: state.builderPhase === 'vote' || state.builderPhase === 'results' ? state.builderPhase : 'build',
    builderVotes: typeof state.builderVotes === 'object' && state.builderVotes !== null ? state.builderVotes as Record<string, number> : {},
  };
}

function normalizeIdList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((id): id is string => typeof id === 'string').slice(0, 32) : [];
}

function isBuildWorldRule(rule: OnlineRule): boolean {
  return rule === 'sandbox' || rule === 'builderBattle';
}

function isFreeWorldRule(rule: OnlineRule): boolean {
  return isBuildWorldRule(rule) || rule === 'ffa';
}

function isMoveKey(key: keyof PlayerInput): boolean {
  return key === 'up' || key === 'down' || key === 'left' || key === 'right';
}

function blurTypingTarget() {
  const active = document.activeElement;
  if (active instanceof HTMLElement && active.closest('input, textarea, select, [contenteditable="true"]')) {
    active.blur();
  }
}

function needsRedPlayer(rule: OnlineRule): boolean {
  return rule === 'classic' || rule === 'murderMystery' || rule === 'zombieInfection';
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(max, Math.max(min, value));
}

function cloneInput(input: GameInput): GameInput {
  return { blue: { ...input.blue }, red: { ...input.red } };
}

function getHostKickNotice(profile: PlayerProfile | undefined, kick: KickPayload, language: 'ru' | 'en'): string {
  const nickname = profile?.nickname ?? (language === 'ru' ? 'игрок' : 'player');
  if (kick.banned) {
    return language === 'ru'
      ? `${nickname} получил бан на этом серваке.`
      : `${nickname} is now banned on this server.`;
  }

  return language === 'ru'
    ? `${nickname} кикнут: ${getKickReasonLabel(kick.reason, language)}.`
    : `${nickname} kicked: ${getKickReasonLabel(kick.reason, language)}.`;
}

function parseKickCommand(text: string): { nickname: string; reason: KickReason } | null {
  const match = /^(?:кик|kick)\s*:\s*(.+?)\s+(?:причина|reason)\s*:\s*([a-zа-яё\s]+)$/i.exec(text.trim());
  if (!match) return null;

  const nickname = match[1].trim().slice(0, 16);
  if (!nickname) return null;

  return {
    nickname,
    reason: parseKickReason(match[2]),
  };
}

function parseKickReason(value: string): KickReason {
  const reason = value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (reason === 'читы' || reason === 'cheats' || reason === 'cheat') return 'cheats';
  if (reason === 'багаюз' || reason === 'bugabuse' || reason === 'bug') return 'bugAbuse';
  if (reason === 'токсик' || reason === 'toxic') return 'toxic';
  if (reason === 'спам' || reason === 'спам в чат' || reason === 'чатспам' || reason === 'spam' || reason === 'chat spam' || reason === 'chatspam') return 'chatSpam';
  return 'other';
}

function normalizeNickname(value: string): string {
  return value.trim().toLowerCase();
}

function isNicknameTaken(nickname: string, players: OnlineParticipant[], ownClientId: string): boolean {
  const normalized = normalizeNickname(nickname);
  return players.some((player) => player.clientId !== ownClientId && normalizeNickname(player.nickname) === normalized);
}

function normalizeTargetClientId(value: unknown): string {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object' && value !== null && 'targetClientId' in value) {
    return typeof value.targetClientId === 'string' ? value.targetClientId : '';
  }

  return '';
}

function normalizeKickPayload(value: unknown): TargetedKickPayload {
  const payload = value as Partial<TargetedKickPayload>;
  return {
    reason: parseKickReason(String(payload.reason ?? 'other')),
    banned: Boolean(payload.banned),
    targetClientId: typeof payload.targetClientId === 'string' ? payload.targetClientId : undefined,
  };
}

function normalizePlayerEmote(value: unknown): PlayerEmote {
  const payload = value as Partial<PlayerEmote>;
  return {
    clientId: typeof payload.clientId === 'string' ? payload.clientId.slice(0, 80) : '',
    emote: emotes.some((emote) => emote.id === payload.emote) ? payload.emote as EmoteId : 'wave',
    createdAt: Number.isFinite(payload.createdAt) ? Number(payload.createdAt) : Date.now(),
  };
}

function getEmotePosition(
  emote: PlayerEmote,
  players: OnlineParticipant[],
  extras: Record<string, ExtraPlayer>,
  game: GameState,
): { x: number; y: number } | null {
  const participant = players.find((player) => player.clientId === emote.clientId);
  if (!participant) return null;
  if (participant.slot === 'host') return { x: (game.players.blue.x / ARENA_WIDTH) * 100, y: (game.players.blue.y / ARENA_HEIGHT) * 100 };
  if (participant.slot === 'red') return { x: (game.players.red.x / ARENA_WIDTH) * 100, y: (game.players.red.y / ARENA_HEIGHT) * 100 };
  const extra = extras[participant.clientId];
  return extra ? { x: extra.x, y: extra.y } : null;
}

function getFighterEmoteLabels(
  activeEmotes: Record<string, PlayerEmote>,
  players: OnlineParticipant[],
): Partial<Record<PlayerId, string>> {
  return Object.values(activeEmotes).reduce<Partial<Record<PlayerId, string>>>((labels, emote) => {
    const participant = players.find((player) => player.clientId === emote.clientId);
    if (participant?.slot === 'host') {
      return { ...labels, blue: getEmoteLabel(emote.emote) };
    }

    if (participant?.slot === 'red') {
      return { ...labels, red: getEmoteLabel(emote.emote) };
    }

    return labels;
  }, {});
}

function getExtraEmotePosition(
  emote: PlayerEmote,
  players: OnlineParticipant[],
  extras: Record<string, ExtraPlayer>,
): { x: number; y: number } | null {
  const participant = players.find((player) => player.clientId === emote.clientId);
  const extra = participant?.slot === 'extra' ? extras[participant.clientId] : null;
  return extra ? { x: extra.x, y: extra.y } : null;
}

function PlayerEmoteBubble({ emote, position }: { emote: PlayerEmote; position: { x: number; y: number } }) {
  return (
    <span
      className={`online-emote-bubble emote-${emote.emote}`}
      style={{
        left: `${clampNumber(position.x, 3, 97)}%`,
        top: `${clampNumber(position.y - 8, 4, 94)}%`,
      }}
    >
      {getEmoteLabel(emote.emote)}
    </span>
  );
}

function getEmoteLabel(emote: EmoteId): string {
  return emotes.find((item) => item.id === emote)?.label ?? 'o/';
}

function SandboxAvatar({ color, skin, badge, nickname, x, y }: { color: string; skin: PlayerSkinId; badge?: string; nickname: string; x: number; y: number }) {
  return (
    <div
      className={`online-extra-player skin-${skin} ${badge === 'ZOMBIE' ? 'online-zombie-player' : ''} ${badge === 'DEAD' ? 'online-dead-player' : ''}`}
      style={{
        '--extra-player-color': color,
        left: `${clampNumber(x, 2, 98)}%`,
        top: `${clampNumber(y, 3, 97)}%`,
      } as CSSProperties}
    >
      <span>{nickname}</span>
      {badge && <b>{badge}</b>}
    </div>
  );
}

function getSandboxCameraStyle(
  role: OnlineRole | null,
  slot: GuestSlot,
  game: GameState,
  extras: Record<string, ExtraPlayer>,
  clientId: string,
): CSSProperties {
  const focus = getSandboxFocus(role, slot, game, extras, clientId);

  return {
    '--sandbox-camera-x': `${50 - focus.x * sandboxCameraZoom}%`,
    '--sandbox-camera-y': `${50 - focus.y * sandboxCameraZoom}%`,
    '--sandbox-camera-zoom': sandboxCameraZoom,
  } as CSSProperties;
}

function getSandboxFocus(
  role: OnlineRole | null,
  slot: GuestSlot,
  game: GameState,
  extras: Record<string, ExtraPlayer>,
  clientId: string,
): { x: number; y: number } {
  if (role === 'host') {
    return { x: (game.players.blue.x / ARENA_WIDTH) * 100, y: (game.players.blue.y / ARENA_HEIGHT) * 100 };
  }

  if (slot === 'extra' && extras[clientId]) {
    return { x: extras[clientId].x, y: extras[clientId].y };
  }

  return { x: 50, y: 50 };
}

function normalizeChatMessage(value: unknown): ChatMessage {
  const message = value as Partial<ChatMessage>;
  const sender = message.sender === 'host' || message.sender === 'guest' ? message.sender : 'guest';

  return {
    id: typeof message.id === 'string' ? message.id.slice(0, 80) : `${Date.now()}`,
    sender,
    nickname: typeof message.nickname === 'string' && message.nickname.trim() ? message.nickname.trim().slice(0, 16) : sender,
    text: typeof message.text === 'string' ? message.text.trim().slice(0, 120) : '',
    time: Number.isFinite(message.time) ? Number(message.time) : Date.now(),
  };
}

function normalizeAdminMessage(value: unknown): string {
  return typeof value === 'string' ? value.trim().slice(0, 48) : '';
}

function applyAdminNuke(state: GameState): GameState {
  const red = state.players.red;
  const blue = state.players.blue;
  const redWasAlive = red.hp > 0;
  const effects = [
    ...state.hitEffects,
    { id: state.nextEffectId, x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2, kind: 'explosion' as const, age: 0.95 },
    { id: state.nextEffectId + 1, x: red.x, y: red.y, kind: 'explosion' as const, age: 0.72 },
    ...state.zombies.slice(0, 10).map((zombie, index) => ({
      id: state.nextEffectId + 2 + index,
      x: zombie.x,
      y: zombie.y,
      kind: 'explosion' as const,
      age: 0.48,
    })),
  ];

  return {
    ...state,
    players: {
      ...state.players,
      blue: { ...blue, score: redWasAlive ? blue.score + 1 : blue.score },
      red: { ...red, hp: 0, shockTimer: Math.max(red.shockTimer, 2.4) },
    },
    zombies: [],
    barricades: state.barricades.map((item) => ({ ...item, hp: item.hp - 220 })).filter((item) => item.hp > 0),
    mapBoards: state.mapBoards.map((item) => ({ ...item, hp: item.hp - 220 })).filter((item) => item.hp > 0),
    bullets: [],
    grenades: [],
    hitEffects: effects,
    nextEffectId: state.nextEffectId + effects.length,
  };
}

function applyAdminEmp(state: GameState): GameState {
  const red = state.players.red;
  return {
    ...state,
    players: {
      ...state.players,
      red: {
        ...red,
        shockTimer: Math.max(red.shockTimer, 4.5),
        cooldown: Math.max(red.cooldown, 1.8),
        grenadeCooldown: Math.max(red.grenadeCooldown, 2.4),
      },
    },
    hitEffects: [
      ...state.hitEffects,
      { id: state.nextEffectId, x: red.x, y: red.y, kind: 'explosion', age: 0.42 },
    ],
    nextEffectId: state.nextEffectId + 1,
  };
}

function normalizeInput(value: unknown): PlayerInput {
  const input = value as Partial<PlayerInput>;
  return {
    up: Boolean(input.up),
    down: Boolean(input.down),
    left: Boolean(input.left),
    right: Boolean(input.right),
    shoot: Boolean(input.shoot),
    build: Boolean(input.build),
    grenade: Boolean(input.grenade),
    enterVehicle: Boolean(input.enterVehicle),
  };
}

function normalizeWeapon(value: unknown): WeaponId | null {
  return typeof value === 'string' && ['blaster', 'railgun', 'shotgun', 'custom4', 'custom5', 'termos'].includes(value) ? value as WeaponId : null;
}





