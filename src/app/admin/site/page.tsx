-- Migration 32 (Main site): a single-row settings table so the homepage hero
-- (background image, headline, subtitle) can be changed from the CMS without a
-- redeploy. Falls back to the built-in defaults when a field is null.

create table if not exists public.main_site (
  id            boolean primary key default true,
  hero_url      text,
  hero_title    text,
  hero_subtitle text,
  updated_at    timestamptz default now(),
  constraint main_site_single check (id)
);

alter table public.main_site enable row level security;

drop policy if exists "public reads main_site" on public.main_site;
create policy "public reads main_site" on public.main_site for select using (true);

drop policy if exists "admins manage main_site" on public.main_site;
create policy "admins manage main_site" on public.main_site for all
  using (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('superadmin','admin1','admin2')))
  with check (exists (select 1 from public.profiles p where p.user_id = auth.uid() and p.role in ('superadmin','admin1','admin2')));

insert into public.main_site (id) values (true) on conflict (id) do nothing;
