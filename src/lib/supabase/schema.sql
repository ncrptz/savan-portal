-- Run this in Supabase → SQL Editor

create extension if not exists "uuid-ossp";

-- Profiles
create table public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  role text not null check (role in ('superadmin','admin1','admin2','trainee','organisation')),
  full_name text not null,
  email text not null,
  phone text,
  org_id uuid,
  created_at timestamptz default now()
);
alter table public.profiles enable row level security;
create policy "own profile" on profiles for select using (auth.uid()=user_id);
create policy "admins all profiles" on profiles for select using (
  exists(select 1 from profiles p where p.user_id=auth.uid() and p.role in ('superadmin','admin1','admin2'))
);
create policy "own update" on profiles for update using (auth.uid()=user_id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(user_id,role,full_name,email)
  values(new.id,coalesce(new.raw_user_meta_data->>'role','trainee'),
         coalesce(new.raw_user_meta_data->>'full_name',''),new.email);
  return new;
end;$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Organisations
create table public.organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  logo_url text,
  contact_email text not null,
  contact_phone text,
  status text default 'pending' check(status in('pending','approved','suspended')),
  created_at timestamptz default now()
);
alter table public.organisations enable row level security;
create policy "public approved orgs" on organisations for select using(status='approved');
create policy "admins manage orgs" on organisations for all using(
  exists(select 1 from profiles p where p.user_id=auth.uid() and p.role in('superadmin','admin1'))
);

-- Trainees
create table public.trainees (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id),
  full_name text not null unique,
  email text,
  phone text,
  org_id uuid references organisations(id),
  created_at timestamptz default now()
);
alter table public.trainees enable row level security;
create policy "own trainee" on trainees for select using(auth.uid()=user_id);
create policy "admins manage trainees" on trainees for all using(
  exists(select 1 from profiles p where p.user_id=auth.uid() and p.role in('superadmin','admin1','admin2'))
);

-- Training Events
create table public.training_events (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  event_serial integer not null unique,
  year integer not null,
  month integer not null check(month between 1 and 12),
  session_in_month integer not null check(session_in_month between 1 and 9),
  training_date date not null,
  venue text,
  template_type text not null check(template_type in('T1','T2')),
  sponsored_by text,
  collab_org_id uuid references organisations(id),
  collab_signer_name text,
  collab_signer_title text,
  collab_sig_url text,
  collab_logo_url text,
  status text default 'draft' check(status in('draft','active','completed')),
  participant_count integer default 0,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.training_events enable row level security;
create policy "admins manage events" on training_events for all using(
  exists(select 1 from profiles p where p.user_id=auth.uid() and p.role in('superadmin','admin1','admin2'))
);
create policy "public view events" on training_events for select using(status in('active','completed'));

create sequence if not exists event_serial_seq start 200;
create or replace function next_event_serial() returns integer language sql as $$
  select nextval('event_serial_seq')::integer;
$$;

-- Certificates
create table public.certificates (
  id uuid primary key default uuid_generate_v4(),
  cert_id text not null unique,
  event_id uuid references training_events(id) not null,
  trainee_id uuid references trainees(id),
  trainee_name text not null,
  photo_url text,
  issued_at timestamptz default now(),
  pdf_url text,
  revoked boolean default false,
  revoked_reason text,
  revoked_at timestamptz,
  created_at timestamptz default now()
);
alter table public.certificates enable row level security;
create policy "public verify" on certificates for select using(not revoked);
create policy "admins manage certs" on certificates for all using(
  exists(select 1 from profiles p where p.user_id=auth.uid() and p.role in('superadmin','admin1','admin2'))
);

-- Virtual Courses
create table public.virtual_courses (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text,
  content_url text,
  price integer not null default 0,
  duration_minutes integer,
  status text default 'draft' check(status in('draft','published')),
  created_at timestamptz default now()
);
alter table public.virtual_courses enable row level security;
create policy "public courses" on virtual_courses for select using(status='published');
create policy "admins manage courses" on virtual_courses for all using(
  exists(select 1 from profiles p where p.user_id=auth.uid() and p.role in('superadmin','admin1'))
);

-- Enrollments
create table public.enrollments (
  id uuid primary key default uuid_generate_v4(),
  trainee_id uuid references trainees(id) not null,
  course_id uuid references virtual_courses(id) not null,
  paid boolean default false,
  payment_ref text,
  passed boolean default false,
  score integer,
  cert_id text,
  enrolled_at timestamptz default now(),
  completed_at timestamptz,
  unique(trainee_id,course_id)
);
alter table public.enrollments enable row level security;

-- Storage buckets (run separately or via dashboard)
-- insert into storage.buckets(id,name,public) values('certificates','certificates',false);
-- insert into storage.buckets(id,name,public) values('photos','photos',false);
-- insert into storage.buckets(id,name,public) values('logos','logos',true);
