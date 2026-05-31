-- Run after profiles.sql. Adds extended profile fields for Atlas Hub.

alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;
alter table public.profiles add column if not exists location text default '';
alter table public.profiles add column if not exists website text default '';
alter table public.profiles add column if not exists role text default 'Contributor';
alter table public.profiles add column if not exists settings jsonb default '{
  "showLocation": true,
  "showWebsite": true,
  "showOrganizations": true,
  "showJoinDate": true,
  "showStats": true,
  "showActivity": true
}'::jsonb;
