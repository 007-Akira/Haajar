begin;

create extension if not exists pgcrypto with schema extensions;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  profile_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) > 0),
  description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.event_members (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('member', 'super_organiser')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  unique (event_id, user_id)
);

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  description text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.group_memberships (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('member', 'co_organiser', 'organiser', 'super_organiser')),
  status text not null default 'pending'
    check (status in ('pending', 'active', 'rejected', 'inactive')),
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, user_id),
  check (
    (status = 'active' and approved_by is not null and approved_at is not null)
    or status <> 'active'
  )
);

create index event_members_user_status_idx
  on public.event_members (user_id, status);
create index event_members_event_status_idx
  on public.event_members (event_id, status);
create index groups_event_status_idx
  on public.groups (event_id, status);
create index group_memberships_user_status_idx
  on public.group_memberships (user_id, status);
create index group_memberships_group_status_idx
  on public.group_memberships (group_id, status);
create index group_memberships_group_role_status_idx
  on public.group_memberships (group_id, role, status);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger groups_set_updated_at
before update on public.groups
for each row execute function public.set_updated_at();

create trigger group_memberships_set_updated_at
before update on public.group_memberships
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create or replace function public.is_active_event_member(
  target_event_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members
    where event_id = target_event_id
      and user_id = target_user_id
      and status = 'active'
  );
$$;

create or replace function public.is_event_super_organiser(
  target_event_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.event_members
    where event_id = target_event_id
      and user_id = target_user_id
      and role = 'super_organiser'
      and status = 'active'
  );
$$;

create or replace function public.is_active_group_member(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = target_group_id
      and user_id = target_user_id
      and status = 'active'
  );
$$;

create or replace function public.is_group_manager(
  target_group_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_memberships
    where group_id = target_group_id
      and user_id = target_user_id
      and role in ('organiser', 'super_organiser')
      and status = 'active'
  )
  or exists (
    select 1
    from public.groups g
    where g.id = target_group_id
      and public.is_event_super_organiser(g.event_id, target_user_id)
  );
$$;

create or replace function public.shares_active_group(
  other_user_id uuid,
  target_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.group_memberships mine
    join public.group_memberships theirs
      on theirs.group_id = mine.group_id
    where mine.user_id = target_user_id
      and mine.status = 'active'
      and theirs.user_id = other_user_id
      and theirs.status = 'active'
  );
$$;

revoke all on function public.set_updated_at() from public;
revoke all on function public.handle_new_user() from public;
revoke all on function public.is_active_event_member(uuid, uuid) from public;
revoke all on function public.is_event_super_organiser(uuid, uuid) from public;
revoke all on function public.is_active_group_member(uuid, uuid) from public;
revoke all on function public.is_group_manager(uuid, uuid) from public;
revoke all on function public.shares_active_group(uuid, uuid) from public;

grant execute on function public.is_active_event_member(uuid, uuid) to authenticated;
grant execute on function public.is_event_super_organiser(uuid, uuid) to authenticated;
grant execute on function public.is_active_group_member(uuid, uuid) to authenticated;
grant execute on function public.is_group_manager(uuid, uuid) to authenticated;
grant execute on function public.shares_active_group(uuid, uuid) to authenticated;

alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.event_members enable row level security;
alter table public.groups enable row level security;
alter table public.group_memberships enable row level security;

create policy profiles_select_own_or_shared_group
on public.profiles for select to authenticated
using (
  id = auth.uid()
  or public.shares_active_group(id)
);

create policy profiles_update_own
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy events_select_active_members
on public.events for select to authenticated
using (public.is_active_event_member(id));

create policy events_insert_authenticated
on public.events for insert to authenticated
with check (created_by = auth.uid());

create policy events_update_super_organisers
on public.events for update to authenticated
using (public.is_event_super_organiser(id))
with check (public.is_event_super_organiser(id));

create policy event_members_select_event_members
on public.event_members for select to authenticated
using (public.is_active_event_member(event_id));

create policy event_members_insert_super_organisers
on public.event_members for insert to authenticated
with check (public.is_event_super_organiser(event_id));

create policy event_members_update_super_organisers
on public.event_members for update to authenticated
using (public.is_event_super_organiser(event_id))
with check (public.is_event_super_organiser(event_id));

create policy event_members_delete_super_organisers
on public.event_members for delete to authenticated
using (public.is_event_super_organiser(event_id));

create policy groups_select_members_or_event_super_organisers
on public.groups for select to authenticated
using (
  public.is_active_group_member(id)
  or public.is_event_super_organiser(event_id)
);

create policy groups_insert_event_super_organisers
on public.groups for insert to authenticated
with check (
  created_by = auth.uid()
  and public.is_event_super_organiser(event_id)
);

create policy groups_update_managers
on public.groups for update to authenticated
using (public.is_group_manager(id))
with check (public.is_group_manager(id));

create policy group_memberships_select_group_members
on public.group_memberships for select to authenticated
using (
  user_id = auth.uid()
  or public.is_active_group_member(group_id)
  or public.is_group_manager(group_id)
);

create policy group_memberships_insert_managers
on public.group_memberships for insert to authenticated
with check (
  public.is_group_manager(group_id)
  and role = 'member'
  and user_id <> auth.uid()
);

create policy group_memberships_update_managers
on public.group_memberships for update to authenticated
using (public.is_group_manager(group_id))
with check (
  public.is_group_manager(group_id)
  and user_id <> auth.uid()
);

create policy group_memberships_delete_managers
on public.group_memberships for delete to authenticated
using (
  public.is_group_manager(group_id)
  and user_id <> auth.uid()
);

revoke all on public.profiles, public.events, public.event_members, public.groups,
  public.group_memberships from anon, authenticated;

grant select on public.profiles, public.events, public.event_members, public.groups,
  public.group_memberships to authenticated;
grant update (full_name, phone, profile_completed) on public.profiles to authenticated;
grant insert (name, description, created_by, status) on public.events to authenticated;
grant update (name, description, status) on public.events to authenticated;
grant insert (event_id, user_id, role, status) on public.event_members to authenticated;
grant update (role, status) on public.event_members to authenticated;
grant delete on public.event_members to authenticated;
grant insert (event_id, name, description, created_by, status) on public.groups to authenticated;
grant update (name, description, status) on public.groups to authenticated;
grant insert (group_id, user_id, status) on public.group_memberships to authenticated;
grant update (role, status, approved_by, approved_at)
  on public.group_memberships to authenticated;
grant delete on public.group_memberships to authenticated;

create or replace function public.create_event(
  event_name text,
  event_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_event_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(event_name), '') is null then
    raise exception 'Event name is required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.profiles where id = caller_id) then
    raise exception 'Profile required' using errcode = '23503';
  end if;

  insert into public.events (name, description, created_by)
  values (btrim(event_name), nullif(btrim(event_description), ''), caller_id)
  returning id into new_event_id;

  insert into public.event_members (event_id, user_id, role, status)
  values (new_event_id, caller_id, 'super_organiser', 'active');

  return new_event_id;
end;
$$;

create or replace function public.create_group(
  parent_event_id uuid,
  group_name text,
  group_description text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  new_group_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(group_name), '') is null then
    raise exception 'Group name is required' using errcode = '22023';
  end if;
  if not public.is_event_super_organiser(parent_event_id, caller_id) then
    raise exception 'Event super organiser permission required' using errcode = '42501';
  end if;

  insert into public.groups (event_id, name, description, created_by)
  values (
    parent_event_id,
    btrim(group_name),
    nullif(btrim(group_description), ''),
    caller_id
  )
  returning id into new_group_id;

  insert into public.group_memberships (
    group_id,
    user_id,
    role,
    status,
    approved_by,
    approved_at
  )
  values (
    new_group_id,
    caller_id,
    'organiser',
    'active',
    caller_id,
    now()
  );

  return new_group_id;
end;
$$;

revoke all on function public.create_event(text, text) from public;
revoke all on function public.create_group(uuid, text, text) from public;
grant execute on function public.create_event(text, text) to authenticated;
grant execute on function public.create_group(uuid, text, text) to authenticated;

commit;
