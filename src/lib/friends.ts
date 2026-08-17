import type { User } from '@supabase/supabase-js';
import { loadPlayerProfile, type PlayerProfile, type PlayerSkinId } from './playerProfile';
import { supabase } from './supabase';

export type FriendProfile = {
  user_id: string;
  nickname: string;
  color: string;
  skin: PlayerSkinId;
};

export type FriendStatus = 'pending' | 'accepted' | 'rejected';

export type FriendRequest = {
  id: string;
  requester_id: string;
  addressee_id: string | null;
  target_nickname: string | null;
  target_nickname_key: string | null;
  status: FriendStatus;
  created_at: string;
  requester?: FriendProfile;
  addressee?: FriendProfile;
};

export type FriendMessage = {
  id: string;
  request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type FriendRequestRow = Omit<FriendRequest, 'requester' | 'addressee'>;

export async function syncFriendProfile(user: User, profile: PlayerProfile = loadPlayerProfile()): Promise<void> {
  const { error } = await supabase.from('friend_profiles').upsert({
    user_id: user.id,
    nickname: profile.nickname,
    color: profile.color,
    skin: profile.skin,
    updated_at: new Date().toISOString(),
  });
  if (error) throwFriendsError(error);
}

export async function loadFriendRequests(user: User): Promise<FriendRequest[]> {
  await syncFriendProfile(user);
  const { data, error } = await supabase
    .from('friend_requests')
    .select('id,requester_id,addressee_id,target_nickname,target_nickname_key,status,created_at')
    .neq('status', 'rejected')
    .order('created_at', { ascending: false });

  if (error) throwFriendsError(error);

  const rows = (data ?? []) as FriendRequestRow[];
  const ids = [...new Set(rows.flatMap((row) => [row.requester_id, row.addressee_id]).filter(isString))];
  const profiles = await loadProfiles(ids);
  return rows.map((row) => ({
    ...row,
    requester: profiles.get(row.requester_id),
    addressee: row.addressee_id ? profiles.get(row.addressee_id) : undefined,
  }));
}

export async function sendFriendRequest(user: User, targetNickname: string): Promise<void> {
  const cleanNickname = targetNickname.trim().slice(0, 16);
  const nicknameKey = cleanNickname.toLowerCase();
  if (!nicknameKey) throw new Error('Напиши ник друга.');

  await syncFriendProfile(user);
  const target = await findProfileByNickname(nicknameKey);
  if (target?.user_id === user.id) throw new Error('Себя добавить нельзя, даже если очень хочется.');

  const requests = await loadFriendRequests(user);
  const existing = requests.find((request) => {
    const sameTarget = target && request.addressee_id === target.user_id;
    const sameRequester = target && request.requester_id === target.user_id;
    const sameNickname = request.target_nickname_key === nicknameKey;
    return (request.requester_id === user.id && (sameTarget || sameNickname))
      || (request.addressee_id === user.id && sameRequester);
  });
  if (existing?.status === 'accepted') throw new Error('Вы уже друзья.');
  if (existing?.status === 'pending') throw new Error('Заявка уже ждёт ответа.');

  const { error } = await supabase.from('friend_requests').insert({
    requester_id: user.id,
    addressee_id: target?.user_id ?? null,
    target_nickname: target?.nickname ?? cleanNickname,
    target_nickname_key: nicknameKey,
    status: 'pending',
  });
  if (error) throwFriendsError(error);
}

export async function answerFriendRequest(requestId: string, user: User, status: 'accepted' | 'rejected'): Promise<void> {
  const { error } = await supabase
    .from('friend_requests')
    .update({ addressee_id: user.id, status, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throwFriendsError(error);
}

export async function loadFriendMessages(requestId: string): Promise<FriendMessage[]> {
  const { data, error } = await supabase
    .from('friend_messages')
    .select('id,request_id,sender_id,body,created_at')
    .eq('request_id', requestId)
    .order('created_at', { ascending: true })
    .limit(80);
  if (error) throwFriendsError(error);
  return (data ?? []) as FriendMessage[];
}

export async function sendFriendMessage(requestId: string, user: User, body: string): Promise<void> {
  const text = body.trim().slice(0, 240);
  if (!text) return;

  const { error } = await supabase.from('friend_messages').insert({
    request_id: requestId,
    sender_id: user.id,
    body: text,
  });
  if (error) throwFriendsError(error);
}

async function findProfileByNickname(nicknameKey: string): Promise<FriendProfile | null> {
  const { data, error } = await supabase
    .from('friend_profiles')
    .select('user_id,nickname,color,skin')
    .eq('nickname_key', nicknameKey)
    .maybeSingle();
  if (error) throwFriendsError(error);
  return data as FriendProfile | null;
}

async function loadProfiles(userIds: string[]): Promise<Map<string, FriendProfile>> {
  if (userIds.length === 0) return new Map();
  const { data, error } = await supabase
    .from('friend_profiles')
    .select('user_id,nickname,color,skin')
    .in('user_id', userIds);
  if (error) throwFriendsError(error);
  return new Map(((data ?? []) as FriendProfile[]).map((profile) => [profile.user_id, profile]));
}

function isString(value: string | null): value is string {
  return typeof value === 'string';
}

function throwFriendsError(error: { message?: string; code?: string }): never {
  const message = error.message ?? 'Friends request failed.';
  const hint = error.code === 'PGRST205' || message.includes('schema cache')
    ? ' Run database migrations: npm run db:push -- --yes'
    : '';
  throw new Error(`${message}${hint}`);
}
