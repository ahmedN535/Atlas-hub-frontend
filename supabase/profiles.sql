-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- Creates a public profile row for each auth user and stores display name / username.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  username text unique,
  display_name text not null,
  bio text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_username_idx on public.profiles (username);

alter table public.profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on public.profiles;
create policy "Profiles are viewable by everyone"
  on public.profiles
  for select
  using (true);

drop policy if exists "Users can insert their own profile" on public.profiles;
create policy "Users can insert their own profile"
  on public.profiles
  for insert
  with check (auth.uid() = id);

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  final_username text;
  suffix integer := 0;
begin
  base_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    regexp_replace(split_part(coalesce(new.email, 'user'), '@', 1), '[^a-zA-Z0-9_]', '_', 'g')
  );

  if base_username = '' then
    base_username := 'user';
  end if;

  final_username := left(base_username, 50);

  while exists (
    select 1
    from public.profiles
    where username = final_username
      and id <> new.id
  ) loop
    suffix := suffix + 1;
    final_username := left(base_username, 47) || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, email, username, display_name)
  values (
    new.id,
    new.email,
    final_username,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'display_name'), ''),
      split_part(coalesce(new.email, 'Atlas user'), '@', 1),
      'Atlas user'
    )
  )
  on conflict (id) do update
  set
    email = excluded.email,
    display_name = excluded.display_name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
