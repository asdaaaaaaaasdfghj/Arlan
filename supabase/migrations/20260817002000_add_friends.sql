create table if not exists public.friend_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nickname text not null,
  nickname_key text generated always as (lower(nickname)) stored,
  color text not null default '#3a86ff',
  skin text not null default 'none',
  updated_at timestamptz not null default now()
);

create unique index if not exists friend_profiles_nickname_key_idx
  on public.friend_profiles (nickname_key);

alter table public.friend_profiles enable row level security;

create policy "read friend profiles"
  on public.friend_profiles for select
  to authenticated
  using (true);

create policy "insert own friend profile"
  on public.friend_profiles for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "update own friend profile"
  on public.friend_profiles for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  addressee_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friend_requests_not_self check (requester_id <> addressee_id)
);

create index if not exists friend_requests_requester_idx
  on public.friend_requests (requester_id);

create index if not exists friend_requests_addressee_idx
  on public.friend_requests (addressee_id);

alter table public.friend_requests enable row level security;

create policy "read own friend requests"
  on public.friend_requests for select
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "create own friend requests"
  on public.friend_requests for insert
  to authenticated
  with check (auth.uid() = requester_id and status = 'pending');

create policy "answer incoming friend requests"
  on public.friend_requests for update
  to authenticated
  using (auth.uid() = addressee_id)
  with check (auth.uid() = addressee_id);

create policy "delete own friend requests"
  on public.friend_requests for delete
  to authenticated
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create table if not exists public.friend_messages (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.friend_requests (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(body) <= 240),
  created_at timestamptz not null default now()
);

create index if not exists friend_messages_request_idx
  on public.friend_messages (request_id, created_at);

alter table public.friend_messages enable row level security;

create policy "read accepted friend messages"
  on public.friend_messages for select
  to authenticated
  using (
    exists (
      select 1 from public.friend_requests fr
      where fr.id = request_id
        and fr.status = 'accepted'
        and (fr.requester_id = auth.uid() or fr.addressee_id = auth.uid())
    )
  );

create policy "send accepted friend messages"
  on public.friend_messages for insert
  to authenticated
  with check (
    auth.uid() = sender_id
    and exists (
      select 1 from public.friend_requests fr
      where fr.id = request_id
        and fr.status = 'accepted'
        and (fr.requester_id = auth.uid() or fr.addressee_id = auth.uid())
    )
  );
