-- Create role enum
create type public.app_role as enum ('admin', 'user');

-- Create user_roles table
create table public.user_roles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete cascade not null,
    role app_role not null,
    created_at timestamp with time zone default now(),
    unique (user_id, role)
);

-- Enable RLS on user_roles
alter table public.user_roles enable row level security;

-- Create security definer function to check roles
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  )
$$;

-- RLS policies for user_roles
create policy "Users can view their own roles"
on public.user_roles
for select
to authenticated
using (auth.uid() = user_id);

create policy "Only admins can manage roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Update admin_settings RLS policies
drop policy if exists "Public can read admin settings" on public.admin_settings;
drop policy if exists "Service role can update admin settings" on public.admin_settings;

create policy "Only admins can read admin settings"
on public.admin_settings
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Only admins can update admin settings"
on public.admin_settings
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Update chat_analytics RLS policies
drop policy if exists "Public can read own analytics" on public.chat_analytics;
drop policy if exists "Public can insert chat analytics" on public.chat_analytics;
drop policy if exists "Service role can manage analytics" on public.chat_analytics;

create policy "Only admins can read chat analytics"
on public.chat_analytics
for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

create policy "Only admins can insert chat analytics"
on public.chat_analytics
for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Only admins can update chat analytics"
on public.chat_analytics
for update
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Update tooltip_contents RLS policies
drop policy if exists "Public can read tooltip contents" on public.tooltip_contents;
drop policy if exists "Service role can manage tooltips" on public.tooltip_contents;

create policy "Everyone can read active tooltips"
on public.tooltip_contents
for select
to authenticated, anon
using (is_active = true);

create policy "Only admins can manage tooltips"
on public.tooltip_contents
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'));