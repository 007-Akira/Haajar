begin;

-- Hierarchy is additive because groups created before this migration are real
-- hosted data. Existing flat groups remain operational roots until an organiser
-- explicitly places them under a category; all newly created hierarchy-aware
-- operational groups are validated by secured creation functions.
alter table public.groups
  add column group_kind text not null default 'operational'
    check (group_kind in ('category', 'operational')),
  add column parent_group_id uuid references public.groups(id) on delete restrict;

create index groups_event_parent_idx on public.groups(event_id, parent_group_id);
create unique index groups_id_event_attendance_key on public.groups(id, event_id);

create or replace function public.enforce_group_hierarchy()
returns trigger language plpgsql security definer set search_path = '' as $$
declare parent_row public.groups%rowtype; cursor_id uuid; hop_count integer := 0;
begin
  if new.parent_group_id = new.id then
    raise exception 'A group cannot be its own parent' using errcode = '23514';
  end if;
  if new.group_kind = 'category' and new.parent_group_id is not null then
    raise exception 'Category groups cannot have a parent' using errcode = '23514';
  end if;
  if new.parent_group_id is not null then
    select * into parent_row from public.groups where id = new.parent_group_id;
    if not found or parent_row.event_id <> new.event_id or parent_row.group_kind <> 'category' then
      raise exception 'Operational parent must be a category in the same event' using errcode = '23514';
    end if;
    if new.group_kind <> 'operational' then
      raise exception 'Only operational groups may have a parent' using errcode = '23514';
    end if;
    cursor_id := new.parent_group_id;
    while cursor_id is not null loop
      if cursor_id = new.id then raise exception 'Group hierarchy cycle detected' using errcode = '23514'; end if;
      select parent_group_id into cursor_id from public.groups where id = cursor_id;
      hop_count := hop_count + 1;
      if hop_count > 32 then raise exception 'Group hierarchy is too deep' using errcode = '23514'; end if;
    end loop;
  end if;
  if tg_op = 'UPDATE' and old.group_kind = 'category' and new.group_kind <> 'category'
    and exists(select 1 from public.groups where parent_group_id = old.id) then
    raise exception 'A category with child groups cannot become operational' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger groups_enforce_hierarchy
before insert or update of event_id, group_kind, parent_group_id on public.groups
for each row execute function public.enforce_group_hierarchy();
revoke all on function public.enforce_group_hierarchy() from public, anon, authenticated;

-- Operational membership is exclusive within a category. The denormalised
-- category key is always derived by the database and cannot be selected by a
-- client. The partial unique index is the final concurrency-safe guard.
alter table public.group_memberships
  add column category_group_id uuid references public.groups(id) on delete restrict;

create or replace function public.enforce_operational_membership_exclusivity()
returns trigger language plpgsql security definer set search_path = '' as $$
declare target_group public.groups%rowtype;
begin
  select * into target_group from public.groups where id = new.group_id;
  if not found then
    raise exception 'Group not found' using errcode = '23503';
  end if;

  new.category_group_id := case
    when target_group.group_kind = 'operational' then target_group.parent_group_id
    else null
  end;

  if new.status = 'active' and new.category_group_id is not null and exists(
    select 1 from public.group_memberships sibling
    where sibling.category_group_id = new.category_group_id
      and sibling.user_id = new.user_id
      and sibling.status = 'active'
      and sibling.id <> new.id
  ) then
    raise exception 'Member already belongs to an operational subgroup in this category'
      using errcode = '23505', detail = 'CATEGORY_MEMBERSHIP_CONFLICT';
  end if;
  return new;
end $$;

create trigger group_memberships_enforce_category_exclusivity
before insert or update of group_id, user_id, status, category_group_id
on public.group_memberships for each row
execute function public.enforce_operational_membership_exclusivity();

create unique index group_memberships_one_active_operational_per_category
  on public.group_memberships(category_group_id, user_id)
  where status = 'active' and category_group_id is not null;
create index group_memberships_category_status_idx
  on public.group_memberships(category_group_id, status, user_id);

create or replace function public.refresh_group_membership_category_scope()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if old.group_kind is distinct from new.group_kind
    or old.parent_group_id is distinct from new.parent_group_id then
    update public.group_memberships set group_id = group_id where group_id = new.id;
  end if;
  return new;
end $$;
create trigger groups_refresh_membership_category_scope
after update of group_kind, parent_group_id on public.groups
for each row execute function public.refresh_group_membership_category_scope();

revoke all on function public.enforce_operational_membership_exclusivity(),
  public.refresh_group_membership_category_scope() from public, anon, authenticated;

create or replace function public.create_category_group(target_event_id uuid, group_name text,
  group_description text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); new_group_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.is_event_super_organiser(target_event_id,caller_id) then
    raise exception 'Super organiser permission required' using errcode='42501'; end if;
  if not exists(select 1 from public.events where id=target_event_id and status='active') then
    raise exception 'Active event required' using errcode='55000'; end if;
  if nullif(btrim(group_name),'') is null then raise exception 'Category name is required' using errcode='22023'; end if;
  insert into public.groups(event_id,name,description,created_by,status,group_kind,parent_group_id)
    values(target_event_id,btrim(group_name),nullif(btrim(group_description),''),caller_id,'active','category',null)
    returning id into new_group_id;
  insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
    values(new_group_id,caller_id,'super_organiser','active',caller_id,now());
  return new_group_id;
end $$;

create or replace function public.create_operational_group(target_category_group_id uuid,group_name text,
  group_description text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); category public.groups%rowtype; new_group_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into category from public.groups where id=target_category_group_id for share;
  if not found or category.group_kind<>'category' or category.status<>'active' then
    raise exception 'Active category required' using errcode='55000'; end if;
  if not public.is_event_super_organiser(category.event_id,caller_id)
    and not public.is_group_manager(category.id,caller_id) then
    raise exception 'Category organiser permission required' using errcode='42501'; end if;
  if nullif(btrim(group_name),'') is null then raise exception 'Operational group name is required' using errcode='22023'; end if;
  insert into public.groups(event_id,name,description,created_by,status,group_kind,parent_group_id)
    values(category.event_id,btrim(group_name),nullif(btrim(group_description),''),caller_id,'active','operational',category.id)
    returning id into new_group_id;
  -- Event super organisers already manage every child unit. Give the creator an
  -- operational organiser membership only when it does not violate exclusivity.
  if not public.is_event_super_organiser(category.event_id,caller_id)
    and not exists(select 1 from public.group_memberships
    where category_group_id=category.id and user_id=caller_id and status='active') then
    insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
      values(new_group_id,caller_id,'organiser','active',caller_id,now());
  end if;
  return new_group_id;
end $$;

revoke all on function public.create_category_group(uuid,text,text),
  public.create_operational_group(uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_category_group(uuid,text,text),
  public.create_operational_group(uuid,text,text) to authenticated;

-- Preserve the already typed mobile RPC while making its UUID a hierarchy
-- parent: an event creates a category, while a category creates an operational
-- child. Authority remains in the two narrowly scoped functions above.
create or replace function public.create_group(parent_event_id uuid,group_name text,
  group_description text default null)
returns uuid language plpgsql volatile security definer set search_path = '' as $$
begin
  if exists(select 1 from public.groups where id=parent_event_id and group_kind='category') then
    return public.create_operational_group(parent_event_id,group_name,group_description);
  end if;
  return public.create_category_group(parent_event_id,group_name,group_description);
end $$;
revoke all on function public.create_group(uuid,text,text) from public,anon,authenticated;
grant execute on function public.create_group(uuid,text,text) to authenticated;

create or replace function public.transfer_operational_group_membership(
  source_membership_id uuid,
  target_operational_group_id uuid
)
returns table (
  group_membership_id uuid,
  source_group_id uuid,
  target_group_id uuid,
  qr_version integer
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  source_membership public.group_memberships%rowtype;
  source_group public.groups%rowtype;
  target_group public.groups%rowtype;
  target_membership_id uuid;
  issued_version integer;
  discarded_credential_id uuid;
  discarded_plain_token text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode='42501';
  end if;
  select * into source_membership from public.group_memberships
    where id=source_membership_id for update;
  if not found or source_membership.status<>'active' then
    raise exception 'Active source membership required' using errcode='P0002';
  end if;
  select * into source_group from public.groups where id=source_membership.group_id for share;
  select * into target_group from public.groups where id=target_operational_group_id for share;
  if not found or source_group.group_kind<>'operational'
    or target_group.group_kind<>'operational'
    or source_group.parent_group_id is null
    or source_group.parent_group_id is distinct from target_group.parent_group_id then
    raise exception 'Transfer requires sibling operational groups' using errcode='22023';
  end if;
  if target_group.status<>'active'
    or not exists(select 1 from public.groups
      where id=source_group.parent_group_id and status='active' and group_kind='category')
    or not exists(select 1 from public.events where id=source_group.event_id and status='active') then
    raise exception 'Active event, category, and target group required' using errcode='55000';
  end if;
  if not public.is_event_super_organiser(source_group.event_id,caller_id) then
    raise exception 'Event super organiser permission required' using errcode='42501';
  end if;

  -- Serialise transfers/assignments for this user and category. The unique
  -- index remains authoritative for every other concurrent write path.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(source_group.parent_group_id::text || ':' || source_membership.user_id::text, 0)
  );

  update public.group_memberships set status='inactive',updated_at=now()
    where id=source_membership.id;
  update public.qr_credentials set status='revoked',revoked_at=now()
    where group_membership_id=source_membership.id and status='active';

  insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
    values(target_group.id,source_membership.user_id,source_membership.role,'active',caller_id,now())
  on conflict(group_id,user_id) do update set
    role=excluded.role,status='active',approved_by=caller_id,approved_at=now(),updated_at=now()
  returning id into target_membership_id;

  select issued.qr_credential_id,issued.qr_token,issued.qr_version
    into discarded_credential_id,discarded_plain_token,issued_version
    from public.issue_membership_qr(target_membership_id) issued;

  perform public.write_haajar_audit(source_group.event_id,target_group.id,caller_id,
    'group_membership',target_membership_id,'group_membership.transferred',
    jsonb_build_object('source_group_id',source_group.id,'role',source_membership.role),
    jsonb_build_object('target_group_id',target_group.id,'role',source_membership.role,
      'qr_version',issued_version),
    jsonb_build_object('category_group_id',source_group.parent_group_id));

  group_membership_id:=target_membership_id;
  source_group_id:=source_group.id;
  target_group_id:=target_group.id;
  qr_version:=issued_version;
  return next;
end $$;
revoke all on function public.transfer_operational_group_membership(uuid,uuid)
  from public,anon,authenticated;
grant execute on function public.transfer_operational_group_membership(uuid,uuid)
  to authenticated;

create table public.attendance_sessions (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  scope_type text not null check (scope_type in ('general', 'category')),
  category_group_id uuid references public.groups(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  note text check (note is null or length(note) <= 2000),
  started_by uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((scope_type = 'general' and category_group_id is null)
    or (scope_type = 'category' and category_group_id is not null)),
  check ((status = 'active' and closed_at is null and closed_by is null)
    or (status in ('closed', 'cancelled') and closed_at is not null and closed_by is not null))
);
alter table public.attendance_sessions add constraint attendance_session_category_event_fk
  foreign key(category_group_id,event_id) references public.groups(id,event_id) on delete restrict;

create unique index attendance_sessions_one_active_general
  on public.attendance_sessions(event_id) where status = 'active' and scope_type = 'general';
create unique index attendance_sessions_one_active_category
  on public.attendance_sessions(category_group_id) where status = 'active' and scope_type = 'category';
create index attendance_sessions_event_started_idx on public.attendance_sessions(event_id, started_at desc);
create trigger attendance_sessions_set_updated_at before update on public.attendance_sessions
for each row execute function public.set_updated_at();

create table public.attendance_units (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  group_id uuid references public.groups(id) on delete restrict,
  unit_type text not null check (unit_type in ('event', 'subgroup')),
  status text not null default 'active' check (status in ('active', 'closed', 'cancelled')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, group_id),
  unique(id, session_id, event_id),
  check ((unit_type = 'event' and group_id is null)
    or (unit_type = 'subgroup' and group_id is not null)),
  check ((status = 'active' and closed_at is null)
    or (status in ('closed', 'cancelled') and closed_at is not null))
);
alter table public.attendance_units add constraint attendance_unit_group_event_fk
  foreign key(group_id,event_id) references public.groups(id,event_id) on delete restrict;
create unique index attendance_units_one_event_unit on public.attendance_units(session_id)
  where unit_type = 'event';
create index attendance_units_session_idx on public.attendance_units(session_id, group_id);
create trigger attendance_units_set_updated_at before update on public.attendance_units
for each row execute function public.set_updated_at();

create table public.attendance_unit_operators (
  attendance_unit_id uuid not null references public.attendance_units(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  assigned_by uuid not null references public.profiles(id) on delete restrict,
  can_scan boolean not null default true,
  can_mark_manually boolean not null default false,
  created_at timestamptz not null default now(),
  primary key(attendance_unit_id, user_id),
  check (can_scan or can_mark_manually)
);
create index attendance_unit_operators_user_idx on public.attendance_unit_operators(user_id, attendance_unit_id);

create table public.attendance_unit_roster (
  id uuid primary key default gen_random_uuid(),
  attendance_unit_id uuid not null references public.attendance_units(id) on delete restrict,
  session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  user_id uuid not null references public.profiles(id) on delete restrict,
  event_member_id uuid not null references public.event_members(id) on delete restrict,
  group_id uuid references public.groups(id) on delete restrict,
  group_membership_id uuid references public.group_memberships(id) on delete restrict,
  role_snapshot text not null,
  display_name_snapshot text not null,
  phone_snapshot text,
  source_group_name_snapshot text,
  created_at timestamptz not null default now(),
  unique(attendance_unit_id, user_id),
  unique(session_id, user_id),
  unique(id, attendance_unit_id, session_id, event_id, user_id),
  check ((group_id is null and group_membership_id is null)
    or (group_id is not null and group_membership_id is not null))
);
create unique index event_members_id_event_user_attendance_key
  on public.event_members(id,event_id,user_id);
create unique index group_memberships_id_group_user_hierarchy_key
  on public.group_memberships(id,group_id,user_id);
alter table public.attendance_unit_roster add constraint attendance_roster_unit_scope_fk
  foreign key(attendance_unit_id,session_id,event_id)
  references public.attendance_units(id,session_id,event_id) on delete restrict;
alter table public.attendance_unit_roster add constraint attendance_roster_event_member_fk
  foreign key(event_member_id,event_id,user_id)
  references public.event_members(id,event_id,user_id) on delete restrict;
alter table public.attendance_unit_roster add constraint attendance_roster_group_membership_fk
  foreign key(group_membership_id,group_id,user_id)
  references public.group_memberships(id,group_id,user_id) on delete restrict;
create index attendance_unit_roster_unit_idx on public.attendance_unit_roster(attendance_unit_id, user_id);
create index attendance_unit_roster_session_group_idx on public.attendance_unit_roster(session_id, group_id);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  attendance_unit_id uuid not null references public.attendance_units(id) on delete restrict,
  session_id uuid not null references public.attendance_sessions(id) on delete restrict,
  event_id uuid not null references public.events(id) on delete restrict,
  roster_entry_id uuid not null,
  user_id uuid not null references public.profiles(id) on delete restrict,
  marked_by uuid not null references public.profiles(id) on delete restrict,
  marking_method text not null check (marking_method in ('qr', 'manual', 'offline_sync')),
  client_operation_id uuid not null,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique(attendance_unit_id, roster_entry_id),
  unique(client_operation_id),
  foreign key (roster_entry_id, attendance_unit_id, session_id, event_id, user_id)
    references public.attendance_unit_roster(id, attendance_unit_id, session_id, event_id, user_id)
    on delete restrict
);
create index attendance_records_unit_marked_idx on public.attendance_records(attendance_unit_id, marked_at);
create index attendance_records_session_idx on public.attendance_records(session_id, attendance_unit_id);

create or replace function public.is_attendance_unit_operator(target_unit_id uuid, target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.attendance_unit_operators o
    where o.attendance_unit_id = target_unit_id and o.user_id = target_user_id)
  or exists(select 1 from public.attendance_units u
    where u.id = target_unit_id and public.is_event_super_organiser(u.event_id, target_user_id));
$$;
revoke all on function public.is_attendance_unit_operator(uuid, uuid) from public, anon, authenticated;
grant execute on function public.is_attendance_unit_operator(uuid, uuid) to authenticated;

create or replace function public.can_view_attendance_session(target_session_id uuid,
  target_user_id uuid default auth.uid())
returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.attendance_sessions s where s.id=target_session_id
    and (public.is_event_super_organiser(s.event_id,target_user_id)
      or (s.scope_type='general' and public.is_active_event_member(s.event_id,target_user_id))))
  or exists(select 1 from public.attendance_unit_roster r
    where r.session_id=target_session_id and r.user_id=target_user_id)
  or exists(select 1 from public.attendance_units u join public.attendance_unit_operators o
    on o.attendance_unit_id=u.id where u.session_id=target_session_id and o.user_id=target_user_id);
$$;
revoke all on function public.can_view_attendance_session(uuid,uuid) from public,anon,authenticated;
grant execute on function public.can_view_attendance_session(uuid,uuid) to authenticated;

alter table public.attendance_sessions enable row level security;
alter table public.attendance_units enable row level security;
alter table public.attendance_unit_operators enable row level security;
alter table public.attendance_unit_roster enable row level security;
alter table public.attendance_records enable row level security;

create policy attendance_sessions_visible_to_event_members on public.attendance_sessions for select to authenticated
using (public.can_view_attendance_session(id));
create policy attendance_units_scoped_visibility on public.attendance_units for select to authenticated
using (public.is_event_super_organiser(event_id) or public.is_attendance_unit_operator(id)
  or exists(select 1 from public.attendance_unit_roster r
    where r.attendance_unit_id=attendance_units.id and r.user_id=auth.uid()));
create policy attendance_operators_self_or_super on public.attendance_unit_operators for select to authenticated
using (user_id=auth.uid() or exists(select 1 from public.attendance_units u
  where u.id=attendance_unit_operators.attendance_unit_id
    and public.is_event_super_organiser(u.event_id)));
create policy attendance_roster_self_operator_or_super on public.attendance_unit_roster for select to authenticated
using (user_id=auth.uid() or public.is_attendance_unit_operator(attendance_unit_id));
create policy attendance_records_self_operator_or_super on public.attendance_records for select to authenticated
using (user_id=auth.uid() or public.is_attendance_unit_operator(attendance_unit_id));

revoke all on public.attendance_sessions, public.attendance_units,
  public.attendance_unit_operators, public.attendance_unit_roster, public.attendance_records
  from public, anon, authenticated;
grant select on public.attendance_sessions, public.attendance_units,
  public.attendance_unit_operators, public.attendance_unit_roster, public.attendance_records
  to authenticated;

commit;
