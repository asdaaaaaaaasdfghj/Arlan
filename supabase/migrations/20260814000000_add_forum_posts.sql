create table if not exists public.forum_posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  guest_id text,
  board text not null check (board in ('general', 'guest')),
  author_name text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table public.forum_posts enable row level security;

create policy "read forum posts"
  on public.forum_posts for select
  using (true);

create policy "insert account forum posts"
  on public.forum_posts for insert
  with check (
    auth.uid() = user_id
    and board = 'general'
    and guest_id is null
  );

create policy "insert guest forum posts"
  on public.forum_posts for insert
  with check (
    auth.uid() is null
    and user_id is null
    and board = 'guest'
    and guest_id is not null
  );

create policy "delete own account forum posts"
  on public.forum_posts for delete
  using (auth.uid() = user_id);
