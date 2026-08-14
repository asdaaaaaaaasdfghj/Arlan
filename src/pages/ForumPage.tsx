import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { createForumPost, loadForumPosts, type ForumBoard, type ForumPost } from '../lib/forum';
import { loadGameSettings } from '../lib/gameSettings';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import './forum.css';

export function ForumPage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const [user, setUser] = useState<User | null>(null);
  const [board, setBoard] = useState<ForumBoard>('general');
  const [posts, setPosts] = useState<ForumPost[]>([]);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState('');
  const guest = !user;
  const activeBoard = guest ? 'guest' : board;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    void refreshPosts(activeBoard);
  }, [activeBoard]);

  async function refreshPosts(nextBoard = activeBoard) {
    try {
      setMessage('');
      setPosts(await loadForumPosts(nextBoard));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load forum.');
    }
  }

  async function sendPost(event: FormEvent) {
    event.preventDefault();
    try {
      await createForumPost(activeBoard, draft);
      setDraft('');
      await refreshPosts(activeBoard);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not send post.');
    }
  }

  return (
    <main className="forum-page">
      <nav className="menu-nav">
        <Link href="/">{language === 'ru' ? 'Главная' : 'Home'}</Link>
        <Link href="/online">{language === 'ru' ? 'Онлайн' : 'Online'}</Link>
      </nav>
      <section className="forum-panel">
        <div className="forum-heading">
          <div>
            <p className="eyebrow">{language === 'ru' ? 'Форум' : 'Forum'}</p>
            <h1>{language === 'ru' ? 'Сообщения игроков' : 'Player posts'}</h1>
          </div>
          <button type="button" onClick={() => void refreshPosts()}>{language === 'ru' ? 'Обновить' : 'Refresh'}</button>
        </div>
        {!isSupabaseConfigured && <p className="forum-warning">Supabase is not configured.</p>}
        <div className="forum-tabs">
          <button type="button" className={activeBoard === 'general' ? 'selected' : ''} disabled={guest} onClick={() => setBoard('general')}>
            {language === 'ru' ? 'Общий' : 'General'}
          </button>
          <button type="button" className={activeBoard === 'guest' ? 'selected' : ''} onClick={() => setBoard('guest')}>
            {language === 'ru' ? 'Гостевой' : 'Guest'}
          </button>
        </div>
        {guest && (
          <p className="forum-warning">
            {language === 'ru' ? 'Ты гость, поэтому писать можно только в гостевой форум.' : 'You are a guest, so you can post only in the guest forum.'}
          </p>
        )}
        <form className="forum-form" onSubmit={sendPost}>
          <textarea value={draft} maxLength={420} placeholder={language === 'ru' ? 'Напиши сообщение...' : 'Write a post...'} onChange={(event) => setDraft(event.target.value)} />
          <button type="submit" disabled={!isSupabaseConfigured || !draft.trim()}>{language === 'ru' ? 'Отправить' : 'Send'}</button>
        </form>
        {message && <p className="forum-warning">{message}</p>}
        <section className="forum-posts">
          {posts.length === 0 ? (
            <p>{language === 'ru' ? 'Пока пусто.' : 'No posts yet.'}</p>
          ) : posts.map((post) => (
            <article className="forum-post" key={post.id}>
              <strong>{post.author_name}</strong>
              <time>{new Date(post.created_at).toLocaleString()}</time>
              <p>{post.body}</p>
            </article>
          ))}
        </section>
      </section>
    </main>
  );
}
