import type { PlayerProfile } from './playerProfile';
import type { Language } from './gameSettings';

const banKey = 'arena-online-ban-list';
const banThreshold = 3;
const protectedNicknames = new Set(['adminlol']);

export type KickReason = 'cheats' | 'bugAbuse' | 'toxic' | 'chatSpam' | 'other' | 'banned';

type BanRecord = {
  nickname: string;
  kicks: number;
  banned: boolean;
};

export type KickPayload = {
  reason: KickReason;
  banned: boolean;
};

export function isProtectedNickname(nickname: string): boolean {
  return protectedNicknames.has(normalizeNickname(nickname));
}

export function isProfileBanned(profile: PlayerProfile): boolean {
  if (isProtectedNickname(profile.nickname)) {
    return false;
  }

  return loadBanRecords()[normalizeNickname(profile.nickname)]?.banned ?? false;
}

export function recordKick(profile: PlayerProfile | undefined, reason: KickReason): KickPayload {
  if (!profile || reason === 'other' || reason === 'banned' || isProtectedNickname(profile.nickname)) {
    return { reason, banned: false };
  }

  const records = loadBanRecords();
  const key = normalizeNickname(profile.nickname);
  const current = records[key] ?? { nickname: profile.nickname, kicks: 0, banned: false };
  const next = {
    nickname: profile.nickname,
    kicks: current.kicks + 1,
    banned: current.kicks + 1 >= banThreshold,
  };

  localStorage.setItem(banKey, JSON.stringify({ ...records, [key]: next }));
  return { reason, banned: next.banned };
}

export function getKickReasonLabel(reason: KickReason, language: Language): string {
  const labels: Record<KickReason, { ru: string; en: string }> = {
    cheats: { ru: 'читы', en: 'cheats' },
    bugAbuse: { ru: 'багаюз', en: 'bug abuse' },
    toxic: { ru: 'токсик', en: 'toxic behavior' },
    chatSpam: { ru: 'спам в чат', en: 'chat spam' },
    other: { ru: 'другая причина', en: 'other reason' },
    banned: { ru: 'бан', en: 'ban' },
  };

  return labels[reason][language === 'ru' ? 'ru' : 'en'];
}

function loadBanRecords(): Record<string, BanRecord> {
  try {
    const saved = localStorage.getItem(banKey);
    return saved ? JSON.parse(saved) as Record<string, BanRecord> : {};
  } catch {
    return {};
  }
}

function normalizeNickname(nickname: string): string {
  return nickname.trim().toLowerCase();
}
