-- Migration 34 (Main site): a homepage video controlled from the CMS.
-- Adds video fields to the single-row main_site config table. The video can be
-- a YouTube/Vimeo link (embedded) or an uploaded file URL (HTML5 player).

alter table public.main_site add column if not exists video_url      text;
alter table public.main_site add column if not exists video_title    text;
alter table public.main_site add column if not exists video_active   boolean not null default false;
alter table public.main_site add column if not exists video_autoplay boolean not null default false;
