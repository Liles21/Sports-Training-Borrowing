begin;

create extension if not exists pgcrypto;

-- Role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE public.user_role AS ENUM ('admin', 'borrower');
  END IF;
END $$;

-- Shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Profiles (linked to auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  full_name text,
  role public.user_role not null default 'borrower',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

-- Equipment
create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  quantity integer not null check (quantity >= 0),
  image text not null,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_equipment_category on public.equipment(category);

drop trigger if exists trg_equipment_updated_at on public.equipment;
create trigger trg_equipment_updated_at
before update on public.equipment
for each row execute function public.set_updated_at();

-- Borrow requests
create table if not exists public.borrow_requests (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete cascade,
  user_name text not null,
  quantity integer not null check (quantity > 0),
  borrow_date date not null,
  return_date date not null,
  status text not null check (status in ('pending', 'approved', 'rejected', 'returned')),
  created_at timestamptz not null default now(),
  approved_at timestamptz,
  returned_at timestamptz,
  updated_at timestamptz not null default now()
);

create index if not exists idx_borrow_requests_equipment_id on public.borrow_requests(equipment_id);
create index if not exists idx_borrow_requests_user_id on public.borrow_requests(user_id);
create index if not exists idx_borrow_requests_status on public.borrow_requests(status);

drop trigger if exists trg_borrow_requests_updated_at on public.borrow_requests;
create trigger trg_borrow_requests_updated_at
before update on public.borrow_requests
for each row execute function public.set_updated_at();

-- Notifications
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  message text not null,
  type text not null check (type in ('info', 'warning', 'success', 'error')),
  read boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_notifications_read on public.notifications(read);

drop trigger if exists trg_notifications_updated_at on public.notifications;
create trigger trg_notifications_updated_at
before update on public.notifications
for each row execute function public.set_updated_at();

-- Auto-create profile when user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(
      nullif(new.raw_user_meta_data->>'full_name', ''),
      nullif(new.raw_user_meta_data->>'fullname', ''),
      nullif(new.raw_user_meta_data->>'name', ''),
      split_part(new.email, '@', 1)
    ),
    case
      when lower(coalesce(new.raw_user_meta_data->>'role', 'borrower')) = 'admin' then 'admin'::public.user_role
      else 'borrower'::public.user_role
    end
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Backfill profiles for existing users
insert into public.profiles (id, email, full_name, role)
select
  u.id,
  lower(u.email),
  coalesce(
    nullif(u.raw_user_meta_data->>'full_name', ''),
    nullif(u.raw_user_meta_data->>'fullname', ''),
    nullif(u.raw_user_meta_data->>'name', ''),
    split_part(u.email, '@', 1)
  ) as full_name,
  case
    when lower(coalesce(u.raw_user_meta_data->>'role', 'borrower')) = 'admin' then 'admin'::public.user_role
    else 'borrower'::public.user_role
  end as role
from auth.users u
on conflict (id) do update
set
  email = excluded.email,
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = now();

-- Promote your admin account
update public.profiles p
set
  role = 'admin'::public.user_role,
  full_name = 'admin',
  updated_at = now()
from auth.users u
where p.id = u.id
  and lower(u.email) = lower('admin@gym.com');

-- Keep auth metadata aligned with app token fallback
update auth.users
set raw_user_meta_data =
  coalesce(raw_user_meta_data, '{}'::jsonb)
  || jsonb_build_object('role', 'admin', 'fullname', 'admin', 'name', 'admin')
where lower(email) = lower('admin@gym.com');

-- Optional RLS baseline (safe with service role, safer for direct client access)
alter table public.profiles enable row level security;
alter table public.equipment enable row level security;
alter table public.borrow_requests enable row level security;
alter table public.notifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_select_own_or_admin'
  ) then
    create policy profiles_select_own_or_admin
    on public.profiles for select
    to authenticated
    using (
      auth.uid() = id
      or exists (
        select 1 from public.profiles p
        where p.id = auth.uid() and p.role = 'admin'
      )
    );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'equipment' and policyname = 'equipment_select_authenticated'
  ) then
    create policy equipment_select_authenticated
    on public.equipment for select
    to authenticated
    using (true);
  end if;
end $$;

commit;

-- Verify admin
select u.email, p.role, p.full_name
from auth.users u
join public.profiles p on p.id = u.id
where lower(u.email) = lower('admin@gym.com');
