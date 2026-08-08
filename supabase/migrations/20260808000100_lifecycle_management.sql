begin;

create table public.user_group_preferences (
  user_id uuid not null references public.profiles(id) on delete cascade,
  group_id uuid not null references public.groups(id) on delete cascade,
  is_archived boolean not null default false,
  archived_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, group_id),
  check ((is_archived and archived_at is not null) or (not is_archived and archived_at is null))
);

create trigger user_group_preferences_set_updated_at
before update on public.user_group_preferences
for each row execute function public.set_updated_at();

alter table public.user_group_preferences enable row level security;

-- Lifecycle writes are RPC-only so callers cannot bypass validation or audit logging.
revoke update on public.events from authenticated;
revoke update on public.groups from authenticated;

do $$ declare constraint_name text; begin
  select c.conname into constraint_name from pg_catalog.pg_constraint c
  where c.conrelid='public.audit_logs'::regclass and c.contype='c'
    and pg_catalog.pg_get_constraintdef(c.oid) like '%event_id IS NOT NULL%group_id IS NOT NULL%';
  if constraint_name is not null then execute format('alter table public.audit_logs drop constraint %I',constraint_name); end if;
end $$;
create policy user_group_preferences_owner_select on public.user_group_preferences
for select to authenticated using (user_id = auth.uid());
create policy user_group_preferences_owner_insert on public.user_group_preferences
for insert to authenticated with check (
  user_id = auth.uid() and public.is_active_group_member(group_id, auth.uid())
);
create policy user_group_preferences_owner_update on public.user_group_preferences
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy user_group_preferences_owner_delete on public.user_group_preferences
for delete to authenticated using (user_id = auth.uid());
revoke all on public.user_group_preferences from public, anon, authenticated;
grant select, insert, update, delete on public.user_group_preferences to authenticated;

create or replace function public.set_my_group_archived(target_group_id uuid, archived boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid := auth.uid();
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if not public.is_active_group_member(target_group_id, caller_id) then
    raise exception 'Active group membership required' using errcode='42501';
  end if;
  insert into public.user_group_preferences(user_id,group_id,is_archived,archived_at)
  values(caller_id,target_group_id,archived,case when archived then now() else null end)
  on conflict(user_id,group_id) do update set
    is_archived=excluded.is_archived, archived_at=excluded.archived_at, updated_at=now();
end; $$;

create or replace function public.update_event(target_event_id uuid,event_name text,event_description text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); old_row public.events%rowtype; new_row public.events%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into old_row from public.events where id=target_event_id for update;
  if not found then raise exception 'Event not found' using errcode='P0002'; end if;
  if not public.is_event_super_organiser(target_event_id,caller_id) then raise exception 'Unauthorised' using errcode='42501'; end if;
  if old_row.status<>'active' then raise exception 'Archived event cannot be edited' using errcode='55000'; end if;
  if length(btrim(coalesce(event_name,'')))=0 or length(event_name)>160 then raise exception 'Invalid event name' using errcode='22023'; end if;
  update public.events set name=btrim(event_name),description=nullif(btrim(event_description),'') where id=target_event_id returning * into new_row;
  perform public.write_haajar_audit(target_event_id,null,caller_id,'event',target_event_id,'event_edited',
    jsonb_build_object('name',old_row.name,'description',old_row.description),
    jsonb_build_object('name',new_row.name,'description',new_row.description),'{}'::jsonb);
end; $$;

create or replace function public.update_group(target_group_id uuid,group_name text,group_description text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); old_row public.groups%rowtype; new_row public.groups%rowtype; allowed boolean;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into old_row from public.groups where id=target_group_id for update;
  if not found then raise exception 'Group not found' using errcode='P0002'; end if;
  allowed := public.is_event_super_organiser(old_row.event_id,caller_id) or
    (old_row.group_kind='operational' and exists(select 1 from public.group_memberships gm
      where gm.group_id=target_group_id and gm.user_id=caller_id and gm.role='organiser' and gm.status='active'));
  if not allowed then raise exception 'Unauthorised' using errcode='42501'; end if;
  if old_row.status<>'active' then raise exception 'Archived group cannot be edited' using errcode='55000'; end if;
  if length(btrim(coalesce(group_name,'')))=0 or length(group_name)>160 then raise exception 'Invalid group name' using errcode='22023'; end if;
  update public.groups set name=btrim(group_name),description=nullif(btrim(group_description),'') where id=target_group_id returning * into new_row;
  perform public.write_haajar_audit(old_row.event_id,target_group_id,caller_id,old_row.group_kind,target_group_id,
    old_row.group_kind||'_edited',jsonb_build_object('name',old_row.name,'description',old_row.description),
    jsonb_build_object('name',new_row.name,'description',new_row.description),'{}'::jsonb);
end; $$;

create or replace function public.get_event_delete_eligibility(target_event_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target public.events%rowtype;
begin
  if caller_id is null then return 'unauthorised'; end if;
  select * into target from public.events where id=target_event_id;
  if not found then return 'not_found'; end if;
  if not public.is_event_super_organiser(target_event_id,caller_id) then return 'unauthorised'; end if;
  if exists(select 1 from public.attendance_sessions where event_id=target_event_id and status='active') then return 'active_attendance'; end if;
  if exists(select 1 from public.attendance_sessions where event_id=target_event_id)
    or exists(select 1 from public.groups where event_id=target_event_id)
    or exists(select 1 from public.join_requests jr join public.groups g on g.id=jr.group_id where g.event_id=target_event_id)
    or exists(select 1 from public.event_members where event_id=target_event_id and user_id<>caller_id)
  then return 'requires_archive'; end if;
  return 'can_delete';
end; $$;

create or replace function public.get_group_delete_eligibility(target_group_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target public.groups%rowtype;
begin
  if caller_id is null then return 'unauthorised'; end if;
  select * into target from public.groups where id=target_group_id;
  if not found then return 'not_found'; end if;
  if not public.is_event_super_organiser(target.event_id,caller_id) then return 'unauthorised'; end if;
  if exists(select 1 from public.groups where parent_group_id=target_group_id) then return 'has_children'; end if;
  if exists(select 1 from public.attendance_units where group_id=target_group_id and status='active')
    or exists(select 1 from public.attendance_sessions where category_group_id=target_group_id and status='active')
  then return 'active_attendance'; end if;
  if exists(select 1 from public.attendance_units where group_id=target_group_id)
    or exists(select 1 from public.attendance_sessions where category_group_id=target_group_id)
    or exists(select 1 from public.join_requests where group_id=target_group_id)
    or exists(select 1 from public.group_memberships where group_id=target_group_id and user_id<>caller_id)
  then return 'requires_archive'; end if;
  return 'can_delete';
end; $$;

create or replace function public.archive_event(target_event_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target public.events%rowtype;
begin
  if caller_id is null or not public.is_event_super_organiser(target_event_id,caller_id) then return 'unauthorised'; end if;
  select * into target from public.events where id=target_event_id for update;
  if not found then return 'not_found'; end if;
  if exists(select 1 from public.attendance_sessions where event_id=target_event_id and status='active') then return 'active_attendance'; end if;
  update public.events set status='archived' where id=target_event_id;
  update public.groups set status='archived' where event_id=target_event_id and status='active';
  perform public.write_haajar_audit(target_event_id,null,caller_id,'event',target_event_id,'event_archived',
    jsonb_build_object('status',target.status),jsonb_build_object('status','archived'),'{}'::jsonb);
  return 'archived';
end; $$;

create or replace function public.archive_group(target_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target public.groups%rowtype; allowed boolean; child_count integer; member_count integer;
begin
  if caller_id is null then return 'unauthorised'; end if;
  select * into target from public.groups where id=target_group_id for update;
  if not found then return 'not_found'; end if;
  allowed := public.is_event_super_organiser(target.event_id,caller_id) or
    (target.group_kind='operational' and exists(select 1 from public.group_memberships gm
      where gm.group_id=target_group_id and gm.user_id=caller_id and gm.role='organiser' and gm.status='active'));
  if not allowed then return 'unauthorised'; end if;
  if exists(select 1 from public.attendance_sessions where category_group_id=target_group_id and status='active')
    or exists(select 1 from public.attendance_units where status='active' and
      (group_id=target_group_id or group_id in (select id from public.groups where parent_group_id=target_group_id)))
  then return 'active_attendance'; end if;
  select count(*) into child_count from public.groups where parent_group_id=target_group_id and status='active';
  select count(*) into member_count from public.group_memberships gm where gm.status='active' and
    gm.group_id in (select target_group_id union select id from public.groups where parent_group_id=target_group_id);
  update public.groups set status='archived' where id=target_group_id or
    (target.group_kind='category' and parent_group_id=target_group_id and status='active');
  perform public.write_haajar_audit(target.event_id,target_group_id,caller_id,target.group_kind,target_group_id,
    target.group_kind||'_archived',jsonb_build_object('status',target.status),jsonb_build_object('status','archived'),
    jsonb_build_object('descendant_count',child_count,'affected_member_count',member_count));
  return 'archived';
end; $$;

create or replace function public.delete_event(target_event_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); eligibility text; target public.events%rowtype;
begin
  eligibility:=public.get_event_delete_eligibility(target_event_id);
  if eligibility<>'can_delete' then return eligibility; end if;
  select * into target from public.events where id=target_event_id for update;
  perform public.write_haajar_audit(target_event_id,null,caller_id,'event',target_event_id,'event_delete_attempted',null,null,jsonb_build_object('status','can_delete'));
  delete from public.event_members where event_id=target_event_id;
  delete from public.events where id=target_event_id;
  perform public.write_haajar_audit(null,null,caller_id,'event',target_event_id,'event_deleted',
    jsonb_build_object('name',target.name,'status',target.status),null,'{}'::jsonb);
  return 'deleted';
end; $$;

create or replace function public.delete_group(target_group_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); eligibility text; target public.groups%rowtype;
begin
  eligibility:=public.get_group_delete_eligibility(target_group_id);
  if eligibility<>'can_delete' then return eligibility; end if;
  select * into target from public.groups where id=target_group_id for update;
  perform public.write_haajar_audit(target.event_id,target_group_id,caller_id,target.group_kind,target_group_id,
    target.group_kind||'_delete_attempted',null,null,jsonb_build_object('status','can_delete'));
  delete from public.qr_credentials where group_membership_id in (select id from public.group_memberships where group_id=target_group_id);
  delete from public.group_memberships where group_id=target_group_id;
  delete from public.groups where id=target_group_id;
  perform public.write_haajar_audit(null,null,caller_id,target.group_kind,target_group_id,
    target.group_kind||'_deleted',jsonb_build_object('name',target.name,'status',target.status),null,
    jsonb_build_object('event_id',target.event_id));
  return 'deleted';
end; $$;

create or replace function public.list_my_group_overview()
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); active_groups jsonb; archived_groups jsonb; requests jsonb;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'membership_id',m.id,'group_id',g.id,'group_name',g.name,'group_status',g.status,
    'event_id',e.id,'event_name',e.name,'event_status',e.status,'role',m.role,
    'member_count',(select count(*) from public.group_memberships p where p.group_id=g.id and p.status='active'),
    'qr_available',exists(select 1 from public.qr_credentials q where q.group_membership_id=m.id and q.status='active'),
    'personally_archived',coalesce(pref.is_archived,false)) order by e.name,g.name),'[]'::jsonb)
  into active_groups from public.group_memberships m join public.groups g on g.id=m.group_id
  join public.events e on e.id=g.event_id left join public.user_group_preferences pref on pref.user_id=caller_id and pref.group_id=g.id
  where m.user_id=caller_id and m.status='active' and not coalesce(pref.is_archived,false);
  select coalesce(jsonb_agg(jsonb_build_object(
    'membership_id',m.id,'group_id',g.id,'group_name',g.name,'group_status',g.status,
    'event_id',e.id,'event_name',e.name,'event_status',e.status,'role',m.role,
    'member_count',(select count(*) from public.group_memberships p where p.group_id=g.id and p.status='active'),
    'qr_available',exists(select 1 from public.qr_credentials q where q.group_membership_id=m.id and q.status='active'),
    'personally_archived',true) order by e.name,g.name),'[]'::jsonb)
  into archived_groups from public.group_memberships m join public.groups g on g.id=m.group_id
  join public.events e on e.id=g.event_id join public.user_group_preferences pref on pref.user_id=caller_id and pref.group_id=g.id and pref.is_archived
  where m.user_id=caller_id and m.status='active';
  select coalesce(jsonb_agg(jsonb_build_object('request_id',r.id,'group_id',g.id,'group_name',g.name,
    'group_status',g.status,'event_id',e.id,'event_name',e.name,'event_status',e.status,'status',r.status,
    'submitted_at',r.submitted_at,'reviewed_at',r.reviewed_at,'rejection_reason',r.rejection_reason)
    order by r.submitted_at desc),'[]'::jsonb) into requests from public.join_requests r
    join public.groups g on g.id=r.group_id join public.events e on e.id=g.event_id
    where r.user_id=caller_id and r.status in ('pending','accepted','rejected');
  return jsonb_build_object('active_groups',active_groups,'archived_groups',archived_groups,'requests',requests);
end; $$;

revoke all on function public.set_my_group_archived(uuid,boolean),public.update_event(uuid,text,text),
  public.update_group(uuid,text,text),public.get_event_delete_eligibility(uuid),public.get_group_delete_eligibility(uuid),
  public.archive_event(uuid),public.archive_group(uuid),public.delete_event(uuid),public.delete_group(uuid) from public,anon,authenticated;
grant execute on function public.set_my_group_archived(uuid,boolean),public.update_event(uuid,text,text),
  public.update_group(uuid,text,text),public.get_event_delete_eligibility(uuid),public.get_group_delete_eligibility(uuid),
  public.archive_event(uuid),public.archive_group(uuid),public.delete_event(uuid),public.delete_group(uuid) to authenticated;

commit;
