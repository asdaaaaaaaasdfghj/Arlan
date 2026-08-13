create table if not exists public.published_maps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  map_data jsonb not null,
  created_at timestamptz not null default now()
);

alter table public.published_maps enable row level security;

create policy "read published maps"
  on public.published_maps for select
  using (true);

create policy "insert own published maps"
  on public.published_maps for insert
  with check (auth.uid() = user_id);

create policy "delete own published maps"
  on public.published_maps for delete
  using (auth.uid() = user_id);
