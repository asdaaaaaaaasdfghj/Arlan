import type { User } from '@supabase/supabase-js';
import { type FormEvent, useEffect, useMemo, useState } from 'react';
import { Link } from 'wouter';
import { Auth } from '../components/Auth';
import {
  answerFriendRequest,
  loadFriendMessages,
  loadFriendRequests,
  sendFriendMessage,
  sendFriendRequest,
  syncFriendProfile,
  type FriendMessage,
  type FriendRequest,
} from '../lib/friends';
import { loadGameSettings } from '../lib/gameSettings';
import { t } from '../lib/i18n';
import { loadGuestProfile, loadPlayerProfile } from '../lib/playerProfile';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import './friends.css';

export function FriendsPage() {
  const [settings] = useState(loadGameSettings);
  const language = settings.language;
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [messages, setMessages] = useState<FriendMessage[]>([]);
  const [targetNickname, setTargetNickname] = useState('');
  const [chatDraft, setChatDraft] = useState('');
  const [activeRequestId, setActiveRequestId] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const guestProfile = loadGuestProfile();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    void refreshRequests(user);
  }, [user]);

  const currentNicknameKey = loadPlayerProfile().nickname.toLowerCase();
  const accepted = requests.filter((request) => request.status === 'accepted');
  const incoming = requests.filter((request) => (
    request.status === 'pending'
    && request.requester_id !== user?.id
    && (request.addressee_id === user?.id || request.target_nickname_key === currentNicknameKey)
  ));
  const outgoing = requests.filter((request) => request.status === 'pending' && request.requester_id === user?.id);
  const activeRequest = accepted.find((request) => request.id === activeRequestId) ?? accepted[0];
  const activeFriend = useMemo(
    () => activeRequest ? getOtherProfile(activeRequest, user?.id ?? '') : undefined,
    [activeRequest, user?.id],
  );

  useEffect(() => {
    if (!activeRequest) {
      setMessages([]);
      return;
    }
    setActiveRequestId(activeRequest.id);
    void refreshMessages(activeRequest.id);
  }, [activeRequest?.id]);

  async function refreshRequests(nextUser = user) {
    if (!nextUser) return;
    try {
      setNotice('');
      await syncFriendProfile(nextUser, loadPlayerProfile());
      const nextRequests = await loadFriendRequests(nextUser);
      setRequests(nextRequests);
      if (!activeRequestId) {
        setActiveRequestId(nextRequests.find((request) => request.status === 'accepted')?.id ?? '');
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load friends.');
    }
  }

  async function refreshMessages(requestId = activeRequestId) {
    if (!requestId) return;
    try {
      setMessages(await loadFriendMessages(requestId));
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not load chat.');
    }
  }

  async function addFriend(event: FormEvent) {
    event.preventDefault();
    if (!user) return;
    try {
      setBusy(true);
      await sendFriendRequest(user, targetNickname);
      setTargetNickname('');
      setNotice(language === 'ru' ? 'Заявка отправлена. Теперь ждём подтверждение.' : 'Request sent. Now wait for confirmation.');
      await refreshRequests(user);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send request.');
    } finally {
      setBusy(false);
    }
  }

  async function answer(requestId: string, status: 'accepted' | 'rejected') {
    try {
      setBusy(true);
      if (!user) return;
      await answerFriendRequest(requestId, user, status);
      await refreshRequests();
      setNotice(status === 'accepted'
        ? language === 'ru' ? 'Дружба подтверждена. Чат открыт.' : 'Friendship accepted. Chat unlocked.'
        : language === 'ru' ? 'Заявка отклонена.' : 'Request rejected.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not answer request.');
    } finally {
      setBusy(false);
    }
  }

  async function sendChat(event: FormEvent) {
    event.preventDefault();
    if (!user || !activeRequest) return;
    try {
      await sendFriendMessage(activeRequest.id, user, chatDraft);
      setChatDraft('');
      await refreshMessages(activeRequest.id);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'Could not send message.');
    }
  }

  return (
    <main className="friends-page">
      <nav className="menu-nav">
        <Link href="/">{t(language, 'home')}</Link>
        <Link href="/profile">{language === 'ru' ? 'Профиль' : 'Profile'}</Link>
      </nav>
      <section className="friends-panel">
        <div className="friends-heading">
          <div>
            <p className="eyebrow">{language === 'ru' ? 'Социалка' : 'Social'}</p>
            <h1>{language === 'ru' ? 'Друзья' : 'Friends'}</h1>
          </div>
          <button type="button" onClick={() => void refreshRequests()} disabled={!user || busy}>
            {language === 'ru' ? 'Обновить' : 'Refresh'}
          </button>
        </div>
        {!isSupabaseConfigured && <p className="friends-warning">Supabase is not configured.</p>}
        {!user ? (
          <section className="friends-guest-card">
            <strong>{language === 'ru' ? `Ты сейчас ${guestProfile.nickname}` : `You are ${guestProfile.nickname}`}</strong>
            <p>
              {language === 'ru'
                ? 'Гости могут играть, но заявки в друзья и личный чат работают после входа, чтобы никто не украл чужой ник.'
                : 'Guests can play, but friend requests and private chat need an account so nobody can steal a nickname.'}
            </p>
            <Auth />
          </section>
        ) : (
          <>
            <form className="friend-add-form" onSubmit={addFriend}>
              <label>
                {language === 'ru' ? 'Ник игрока' : 'Player nickname'}
                <input value={targetNickname} maxLength={16} placeholder="ADMINlol" onChange={(event) => setTargetNickname(event.target.value)} />
              </label>
              <button type="submit" disabled={busy || !targetNickname.trim()}>
                {language === 'ru' ? 'Добавить друга' : 'Add friend'}
              </button>
            </form>
            {notice && <p className="friends-warning">{notice}</p>}
            <section className="friends-grid">
              <FriendList
                title={language === 'ru' ? 'Друзья' : 'Friends'}
                empty={language === 'ru' ? 'Пока никого. Самое время написать ник.' : 'Nobody yet. Time to type a nickname.'}
                requests={accepted}
                currentUserId={user.id}
                selectedId={activeRequest?.id ?? ''}
                onSelect={setActiveRequestId}
              />
              <section className="friend-card">
                <h2>{language === 'ru' ? 'Входящие' : 'Incoming'}</h2>
                {incoming.length === 0 ? <p>{language === 'ru' ? 'Заявок нет.' : 'No requests.'}</p> : incoming.map((request) => (
                  <article className="friend-row" key={request.id}>
                    <strong>{request.requester?.nickname ?? 'Unknown'}</strong>
                    <span>{language === 'ru' ? 'хочет дружить' : 'wants to be friends'}</span>
                    <div className="friend-row-actions">
                      <button type="button" disabled={busy} onClick={() => void answer(request.id, 'accepted')}>{language === 'ru' ? 'Да' : 'Yes'}</button>
                      <button type="button" disabled={busy} className="ghost-button" onClick={() => void answer(request.id, 'rejected')}>{language === 'ru' ? 'Нет' : 'No'}</button>
                    </div>
                  </article>
                ))}
              </section>
              <section className="friend-card">
                <h2>{language === 'ru' ? 'Ожидают' : 'Pending'}</h2>
                {outgoing.length === 0 ? <p>{language === 'ru' ? 'Никто не морозится.' : 'Nobody is pending.'}</p> : outgoing.map((request) => (
                  <article className="friend-row" key={request.id}>
                    <strong>{request.addressee?.nickname ?? request.target_nickname ?? 'Unknown'}</strong>
                    <span>{language === 'ru' ? 'ещё не подтвердил' : 'has not accepted yet'}</span>
                  </article>
                ))}
              </section>
              <section className="friend-chat">
                <div className="friend-chat-title">
                  <h2>{activeFriend ? activeFriend.nickname : language === 'ru' ? 'Чатик' : 'Chat'}</h2>
                  <button type="button" disabled={!activeRequest} onClick={() => void refreshMessages()}>↻</button>
                </div>
                <div className="friend-messages">
                  {!activeRequest ? <p>{language === 'ru' ? 'Чат откроется после подтверждения дружбы.' : 'Chat unlocks after friendship is accepted.'}</p> : messages.map((message) => (
                    <p className={message.sender_id === user.id ? 'mine' : ''} key={message.id}>{message.body}</p>
                  ))}
                </div>
                <form className="friend-chat-form" onSubmit={sendChat}>
                  <input value={chatDraft} maxLength={240} disabled={!activeRequest} placeholder={language === 'ru' ? 'Написать другу...' : 'Message a friend...'} onChange={(event) => setChatDraft(event.target.value)} />
                  <button type="submit" disabled={!activeRequest || !chatDraft.trim()}>{language === 'ru' ? 'Отпр' : 'Send'}</button>
                </form>
              </section>
            </section>
          </>
        )}
      </section>
    </main>
  );
}

function FriendList({ title, empty, requests, currentUserId, selectedId, onSelect }: {
  title: string;
  empty: string;
  requests: FriendRequest[];
  currentUserId: string;
  selectedId: string;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="friend-card">
      <h2>{title}</h2>
      {requests.length === 0 ? <p>{empty}</p> : requests.map((request) => {
        const friend = getOtherProfile(request, currentUserId);
        return (
          <button className={selectedId === request.id ? 'friend-pill selected' : 'friend-pill'} type="button" key={request.id} onClick={() => onSelect(request.id)}>
            <span style={{ background: friend?.color ?? '#8b9399' }} />
            {friend?.nickname ?? 'Unknown'}
          </button>
        );
      })}
    </section>
  );
}

function getOtherProfile(request: FriendRequest, currentUserId: string) {
  return request.requester_id === currentUserId ? request.addressee : request.requester;
}
