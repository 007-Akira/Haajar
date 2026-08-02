begin;

-- The roster snapshot keeps historical totals stable when a membership later
-- changes role/status. Attendance history therefore never depends on the live
-- group_memberships roster.
create table public.roll_calls (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete restrict,
  group_id uuid not null references public.groups(id) on delete restrict,
  created_by uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 160),
  note text check (note is null or length(note) <= 2000),
  status text not null default 'active' check (status in ('active', 'closed')),
  started_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_by uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    (status = 'active' and closed_at is null and closed_by is null)
    or (status = 'closed' and closed_at is not null and closed_by is not null)
  )
);

create unique index groups_id_event_id_attendance_key on public.groups (id, event_id);
alter table public.roll_calls
  add constraint roll_calls_group_event_fk
  foreign key (group_id, event_id)
  references public.groups(id, event_id)
  on delete restrict;
create unique index roll_calls_id_event_group_key
  on public.roll_calls (id, event_id, group_id);
create unique index roll_calls_one_active_per_group_idx
  on public.roll_calls (group_id)
  where status = 'active';
create index roll_calls_group_started_idx
  on public.roll_calls (group_id, started_at desc);
create index roll_calls_event_started_idx
  on public.roll_calls (event_id, started_at desc);

create trigger roll_calls_set_updated_at
before update on public.roll_calls
for each row execute function public.set_updated_at();

create unique index group_memberships_id_group_user_attendance_key
  on public.group_memberships (id, group_id, user_id);

create table public.roll_call_roster_members (
  roll_call_id uuid not null,
  event_id uuid not null,
  group_id uuid not null,
  membership_id uuid not null,
  user_id uuid not null,
  role_at_start text not null
    check (role_at_start in ('member', 'co_organiser', 'organiser', 'super_organiser')),
  added_at timestamptz not null default now(),
  primary key (roll_call_id, membership_id),
  constraint roll_call_roster_roll_call_fk
    foreign key (roll_call_id, event_id, group_id)
    references public.roll_calls(id, event_id, group_id)
    on delete restrict,
  constraint roll_call_roster_membership_fk
    foreign key (membership_id, group_id, user_id)
    references public.group_memberships(id, group_id, user_id)
    on delete restrict
);

create unique index roll_call_roster_identity_key
  on public.roll_call_roster_members (
    roll_call_id, membership_id, event_id, group_id, user_id
  );
create index roll_call_roster_user_idx
  on public.roll_call_roster_members (user_id, roll_call_id);

create table public.attendance_records (
  id uuid primary key default gen_random_uuid(),
  roll_call_id uuid not null,
  event_id uuid not null,
  group_id uuid not null,
  membership_id uuid not null,
  user_id uuid not null,
  status text not null default 'present' check (status = 'present'),
  marked_by uuid not null references public.profiles(id) on delete restrict,
  marking_method text not null check (marking_method in ('qr', 'manual')),
  client_operation_id uuid not null,
  marked_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint attendance_record_roster_fk
    foreign key (roll_call_id, membership_id, event_id, group_id, user_id)
    references public.roll_call_roster_members (
      roll_call_id, membership_id, event_id, group_id, user_id
    )
    on delete restrict,
  constraint attendance_one_record_per_member unique (roll_call_id, membership_id),
  constraint attendance_client_operation_unique unique (client_operation_id)
);

create index attendance_records_roll_call_marked_idx
  on public.attendance_records (roll_call_id, marked_at);
create index attendance_records_user_roll_call_idx
  on public.attendance_records (user_id, roll_call_id);

create trigger attendance_records_set_updated_at
before update on public.attendance_records
for each row execute function public.set_updated_at();

create or replace function public.enforce_attendance_record_scope()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_roll_call public.roll_calls%rowtype;
  target_membership public.group_memberships%rowtype;
  target_group public.groups%rowtype;
  target_event public.events%rowtype;
begin
  select * into target_roll_call
  from public.roll_calls
  where id = new.roll_call_id;
  select * into target_membership
  from public.group_memberships
  where id = new.membership_id;
  select * into target_group
  from public.groups
  where id = new.group_id;
  select * into target_event
  from public.events
  where id = new.event_id;

  if target_roll_call.id is null
    or target_roll_call.status <> 'active'
    or target_roll_call.event_id <> new.event_id
    or target_roll_call.group_id <> new.group_id then
    raise exception 'Attendance requires an active matching roll call'
      using errcode = '55000';
  end if;
  if target_group.status <> 'active' or target_event.status <> 'active' then
    raise exception 'Archived groups or events cannot accept attendance'
      using errcode = '55000';
  end if;
  if target_membership.id is null
    or target_membership.status <> 'active'
    or target_membership.group_id <> new.group_id
    or target_membership.user_id <> new.user_id then
    raise exception 'Attendance requires an active matching membership'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create trigger attendance_records_enforce_scope
before insert or update on public.attendance_records
for each row execute function public.enforce_attendance_record_scope();

revoke all on function public.enforce_attendance_record_scope()
  from public, anon, authenticated;

create or replace function public.is_group_attendance_operator(
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
    from public.group_memberships as membership
    where membership.group_id = target_group_id
      and membership.user_id = target_user_id
      and membership.status = 'active'
      and membership.role in ('co_organiser', 'organiser', 'super_organiser')
  )
  or exists (
    select 1
    from public.groups as target_group
    where target_group.id = target_group_id
      and public.is_event_super_organiser(target_group.event_id, target_user_id)
  );
$$;

revoke all on function public.is_group_attendance_operator(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.is_group_attendance_operator(uuid, uuid) to authenticated;

alter table public.roll_calls enable row level security;
alter table public.roll_call_roster_members enable row level security;
alter table public.attendance_records enable row level security;

create policy roll_calls_select_group_participants
on public.roll_calls for select to authenticated
using (
  public.is_active_group_member(group_id)
  or public.is_event_super_organiser(event_id)
);

create policy roll_call_roster_select_own_or_operators
on public.roll_call_roster_members for select to authenticated
using (
  user_id = auth.uid()
  or public.is_group_attendance_operator(group_id)
);

create policy attendance_records_select_own_or_operators
on public.attendance_records for select to authenticated
using (
  user_id = auth.uid()
  or public.is_group_attendance_operator(group_id)
);

revoke all on public.roll_calls, public.roll_call_roster_members,
  public.attendance_records from public, anon, authenticated;
grant select on public.roll_calls, public.roll_call_roster_members,
  public.attendance_records to authenticated;

commit;
