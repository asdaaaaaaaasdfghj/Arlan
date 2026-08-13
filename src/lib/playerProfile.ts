const profileKey = 'arena-player-profile';
const guestNumberKey = 'arena-guest-number';
const guestColor = '#8b9399';

export type PlayerProfile = {
  nickname: string;
  color: string;
  skin: PlayerSkinId;
};

export type PlayerSkinId = 'none' | 'cube' | 'ship' | 'ball' | 'ufo' | 'wave' | 'robot';

export const playerSkins: PlayerSkinId[] = ['none', 'cube', 'ship', 'ball', 'ufo', 'wave', 'robot'];

export const defaultPlayerProfile: PlayerProfile = {
  nickname: 'Player',
  color: '#3a86ff',
  skin: 'none',
};

export function loadGuestProfile(): PlayerProfile {
  return {
    nickname: `GUEST-${loadGuestNumber()}`,
    color: guestColor,
    skin: 'none',
  };
}

export function loadPlayerProfile(): PlayerProfile {
  try {
    const saved = localStorage.getItem(profileKey);
    return saved ? normalizePlayerProfile(JSON.parse(saved)) : defaultPlayerProfile;
  } catch {
    return defaultPlayerProfile;
  }
}

export function savePlayerProfile(profile: PlayerProfile) {
  localStorage.setItem(profileKey, JSON.stringify(normalizePlayerProfile(profile)));
}

export function normalizePlayerProfile(value: unknown): PlayerProfile {
  const profile = typeof value === 'object' && value !== null ? value as Partial<PlayerProfile> : {};
  return {
    nickname: normalizeName(profile.nickname),
    color: normalizeColor(profile.color),
    skin: normalizeSkin(profile.skin),
  };
}

function normalizeName(value: unknown): string {
  if (typeof value !== 'string') {
    return defaultPlayerProfile.nickname;
  }

  const trimmed = value.trim().slice(0, 16);
  return trimmed || defaultPlayerProfile.nickname;
}

function normalizeColor(value: unknown): string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : defaultPlayerProfile.color;
}

function normalizeSkin(value: unknown): PlayerSkinId {
  return typeof value === 'string' && playerSkins.includes(value as PlayerSkinId) ? value as PlayerSkinId : defaultPlayerProfile.skin;
}

function loadGuestNumber(): string {
  try {
    const saved = localStorage.getItem(guestNumberKey);
    if (saved && /^\d{4}$/.test(saved)) {
      return saved;
    }

    const next = `${Math.floor(1000 + Math.random() * 9000)}`;
    localStorage.setItem(guestNumberKey, next);
    return next;
  } catch {
    return '0000';
  }
}
