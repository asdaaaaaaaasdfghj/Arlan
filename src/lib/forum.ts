import { loadGuestProfile, loadPlayerProfile } from './playerProfile';
import { supabase } from './supabase';

export type ForumBoard = 'general' | 'guest';

export type ForumPost = {
  id: string;
  board: ForumBoard;
  author_name: string;
  body: string;
  created_at: string;
};

export async function loadForumPosts(board: ForumBoard): Promise<ForumPost[]> {
  const { data, error } = await supabase
    .from('forum_posts')
    .select('id,board,author_name,body,created_at')
    .eq('board', board)
    .order('created_at', { ascending: false })
    .limit(40);

  if (error) throwForumError(error);
  return (data ?? []) as ForumPost[];
}

export async function createForumPost(board: ForumBoard, body: string): Promise<void> {
  const text = body.trim().slice(0, 420);
  if (!text) return;

  const { data } = await supabase.auth.getUser();
  const user = data.user;
  if (!user && board !== 'guest') {
    throw new Error('Guests can write only in the guest forum.');
  }

  const profile = user ? loadPlayerProfile() : loadGuestProfile();
  const { error } = await supabase.from('forum_posts').insert({
    user_id: user?.id ?? null,
    guest_id: user ? null : profile.nickname,
    board: user ? board : 'guest',
    author_name: profile.nickname,
    body: text,
  });

  if (error) throwForumError(error);
}

function throwForumError(error: { message?: string; code?: string }): never {
  const message = error.message ?? 'Forum request failed.';
  const hint = error.code === 'PGRST205' || message.includes('schema cache')
    ? ' Run database migrations: npm run db:push -- --yes'
    : '';
  throw new Error(`${message}${hint}`);
}
