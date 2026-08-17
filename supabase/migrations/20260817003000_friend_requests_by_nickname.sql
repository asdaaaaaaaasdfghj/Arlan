alter table public.friend_requests
  alter column addressee_id drop not null;

alter table public.friend_requests
  add column if not exists target_nickname text;

alter table public.friend_requests
  add column if not exists target_nickname_key text;

update public.friend_requests fr
set target_nickname = fp.nickname,
    target_nickname_key = fp.nickname_key
from public.friend_profiles fp
where fr.addressee_id = fp.user_id
  and fr.target_nickname is null;

alter table public.friend_requests
  drop constraint if exists friend_requests_not_self;

alter table public.friend_requests
  add constraint friend_requests_not_self
  check (addressee_id is null or requester_id <> addressee_id);

drop policy if exists "read own friend requests" on public.friend_requests;
drop policy if exists "answer incoming friend requests" on public.friend_requests;

create policy "read own friend requests"
  on public.friend_requests for select
  to authenticated
  using (
    auth.uid() = requester_id
    or auth.uid() = addressee_id
    or exists (
      select 1
      from public.friend_profiles fp
      where fp.user_id = auth.uid()
        and fp.nickname_key = target_nickname_key
    )
  );

create policy "answer incoming friend requests"
  on public.friend_requests for update
  to authenticated
  using (
    auth.uid() = addressee_id
    or exists (
      select 1
      from public.friend_profiles fp
      where fp.user_id = auth.uid()
        and fp.nickname_key = target_nickname_key
    )
  )
  with check (auth.uid() = addressee_id);
