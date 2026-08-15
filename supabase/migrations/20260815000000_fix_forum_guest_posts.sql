drop policy if exists "insert account forum posts" on public.forum_posts;

create policy "insert account forum posts"
  on public.forum_posts for insert
  with check (
    auth.uid() = user_id
    and board in ('general', 'guest')
    and guest_id is null
  );
