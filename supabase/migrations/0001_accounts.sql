-- Cloud sync for signed-in users. Every row carries user_id (defaulted from the
-- JWT) and row-level security limits each user to their own rows.
create extension if not exists vector with schema extensions;

create table public.notebooks (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  created_at timestamptz not null default now()
);

create table public.sources (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  notebook_id uuid not null references public.notebooks on delete cascade,
  type text not null check (type in ('youtube', 'pdf', 'audio', 'text')),
  title text not null check (char_length(title) <= 300),
  url text check (char_length(url) <= 200),
  video_id text check (video_id ~ '^[A-Za-z0-9_-]{11}$'),
  added_at timestamptz not null default now()
);

create table public.chunks (
  source_id uuid not null references public.sources on delete cascade,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  idx int not null,
  text text not null check (char_length(text) <= 6000),
  start_time_sec int,
  embedding extensions.vector(768) not null,
  primary key (source_id, idx)
);

create index on public.notebooks (user_id);
create index on public.sources (user_id);
create index on public.sources (notebook_id);
create index on public.chunks (user_id);

alter table public.notebooks enable row level security;
alter table public.sources enable row level security;
alter table public.chunks enable row level security;

-- Parents are checked too: foreign keys bypass RLS, so without the EXISTS a user
-- could attach rows to someone else's notebook or source id.
create policy "own notebooks" on public.notebooks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "own sources" on public.sources for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.notebooks n where n.id = notebook_id and n.user_id = (select auth.uid()))
  );

create policy "own chunks" on public.chunks for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.sources s where s.id = source_id and s.user_id = (select auth.uid()))
  );

-- Per-user storage cap so one account can't fill the database.
create function public.enforce_chunk_quota() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.chunks where user_id = auth.uid()) > 5000 then
    raise exception 'Storage limit reached (5,000 chunks). Delete some sources to add more.';
  end if;
  return null;
end $$;

revoke execute on function public.enforce_chunk_quota() from public, anon, authenticated;

create trigger chunk_quota after insert on public.chunks
  for each statement execute function public.enforce_chunk_quota();
