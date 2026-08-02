begin;

create or replace function public.create_general_attendance_session(
  target_event_id uuid, session_title text, session_note text default null,
  selected_operators jsonb default '[]'::jsonb
) returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); target_event public.events%rowtype;
  new_session_id uuid; new_unit_id uuid; operator_item jsonb; operator_id uuid;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(session_title),'') is null then raise exception 'Attendance title is required' using errcode='22023'; end if;
  select * into target_event from public.events where id=target_event_id for share;
  if not found then raise exception 'Event not found' using errcode='P0002'; end if;
  if target_event.status<>'active' then raise exception 'Archived event' using errcode='55000'; end if;
  if not public.is_event_super_organiser(target_event.id,caller_id) then
    raise exception 'Super organiser permission required' using errcode='42501';
  end if;
  if jsonb_typeof(selected_operators)<>'array' then raise exception 'Operators must be an array' using errcode='22023'; end if;

  insert into public.attendance_sessions(event_id,scope_type,title,note,started_by)
    values(target_event.id,'general',btrim(session_title),nullif(btrim(session_note),''),caller_id)
    returning id into new_session_id;
  insert into public.attendance_units(session_id,event_id,unit_type)
    values(new_session_id,target_event.id,'event') returning id into new_unit_id;
  insert into public.attendance_unit_roster(attendance_unit_id,session_id,event_id,user_id,event_member_id,
    role_snapshot,display_name_snapshot,phone_snapshot)
  select new_unit_id,new_session_id,target_event.id,em.user_id,em.id,em.role,
    coalesce(nullif(btrim(p.full_name),''),'Member'),p.phone
  from public.event_members em join public.profiles p on p.id=em.user_id
  where em.event_id=target_event.id and em.status='active';
  if not found then raise exception 'No active event members' using errcode='55000'; end if;

  insert into public.attendance_unit_operators(attendance_unit_id,user_id,assigned_by,can_scan,can_mark_manually)
    values(new_unit_id,caller_id,caller_id,true,true);
  for operator_item in select value from jsonb_array_elements(selected_operators) loop
    operator_id := nullif(operator_item->>'user_id','')::uuid;
    if operator_id is null or not public.is_active_event_member(target_event.id,operator_id) then
      raise exception 'Every volunteer must be an active event member' using errcode='22023';
    end if;
    insert into public.attendance_unit_operators(attendance_unit_id,user_id,assigned_by,can_scan,can_mark_manually)
      values(new_unit_id,operator_id,caller_id,coalesce((operator_item->>'can_scan')::boolean,true),
        coalesce((operator_item->>'can_mark_manually')::boolean,false))
      on conflict(attendance_unit_id,user_id) do update set
        can_scan=excluded.can_scan,can_mark_manually=excluded.can_mark_manually,assigned_by=caller_id;
  end loop;
  perform public.write_haajar_audit(target_event.id,null,caller_id,'attendance_session',new_session_id,
    'attendance_session.general_started',null,jsonb_build_object('status','active','roster_count',
      (select count(*) from public.attendance_unit_roster where session_id=new_session_id)),null);
  return new_session_id;
exception when unique_violation then
  raise exception 'An active General attendance session already exists' using errcode='23505';
end $$;

create or replace function public.create_category_attendance_session(
  target_category_group_id uuid, session_title text, session_note text default null
) returns uuid language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); category public.groups%rowtype; target_event public.events%rowtype;
  new_session_id uuid; child record; new_unit_id uuid; child_count integer:=0;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  if nullif(btrim(session_title),'') is null then raise exception 'Attendance title is required' using errcode='22023'; end if;
  select * into category from public.groups where id=target_category_group_id for share;
  if not found or category.group_kind<>'category' then raise exception 'Category not found' using errcode='P0002'; end if;
  select * into target_event from public.events where id=category.event_id for share;
  if category.status<>'active' or target_event.status<>'active' then raise exception 'Archived category or event' using errcode='55000'; end if;
  if not public.is_event_super_organiser(category.event_id,caller_id) then
    raise exception 'Super organiser permission required' using errcode='42501';
  end if;
  if exists(select 1 from public.group_memberships gm join public.groups g on g.id=gm.group_id
    where g.parent_group_id=category.id and g.status='active' and gm.status='active'
    group by gm.user_id having count(*)>1) then
    raise exception 'A member belongs to multiple operational subgroups in this category' using errcode='23505';
  end if;
  insert into public.attendance_sessions(event_id,scope_type,category_group_id,title,note,started_by)
    values(category.event_id,'category',category.id,btrim(session_title),nullif(btrim(session_note),''),caller_id)
    returning id into new_session_id;
  for child in select * from public.groups g where g.parent_group_id=category.id
    and g.group_kind='operational' and g.status='active' order by g.created_at,g.id loop
    child_count:=child_count+1;
    insert into public.attendance_units(session_id,event_id,group_id,unit_type)
      values(new_session_id,category.event_id,child.id,'subgroup') returning id into new_unit_id;
    insert into public.attendance_unit_roster(attendance_unit_id,session_id,event_id,user_id,event_member_id,
      group_id,group_membership_id,role_snapshot,display_name_snapshot,phone_snapshot,source_group_name_snapshot)
    select new_unit_id,new_session_id,category.event_id,gm.user_id,em.id,child.id,gm.id,gm.role,
      coalesce(nullif(btrim(p.full_name),''),'Member'),p.phone,child.name
    from public.group_memberships gm join public.event_members em
      on em.event_id=category.event_id and em.user_id=gm.user_id and em.status='active'
      join public.profiles p on p.id=gm.user_id
    where gm.group_id=child.id and gm.status='active';
    insert into public.attendance_unit_operators(attendance_unit_id,user_id,assigned_by,can_scan,can_mark_manually)
    select new_unit_id,gm.user_id,caller_id,true,true from public.group_memberships gm
      where gm.group_id=child.id and gm.status='active' and gm.role in ('co_organiser','organiser','super_organiser');
  end loop;
  if child_count=0 then raise exception 'Category has no active operational subgroups' using errcode='55000'; end if;
  perform public.write_haajar_audit(category.event_id,category.id,caller_id,'attendance_session',new_session_id,
    'attendance_session.category_started',null,jsonb_build_object('status','active','unit_count',child_count,
      'roster_count',(select count(*) from public.attendance_unit_roster where session_id=new_session_id)),null);
  return new_session_id;
exception when unique_violation then
  raise exception 'An active category attendance session already exists or contains duplicate members' using errcode='23505';
end $$;

-- Compatibility entry point used by the existing category screen.
create or replace function public.create_roll_call(target_group_id uuid, roll_call_title text, roll_call_note text default null)
returns uuid language sql volatile security definer set search_path = '' as $$
  select public.create_category_attendance_session(target_group_id,roll_call_title,roll_call_note);
$$;

create or replace function public.set_general_attendance_operator(
  target_session_id uuid,target_user_id uuid,allow_scan boolean,allow_manual boolean
) returns boolean language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target public.attendance_sessions%rowtype; unit_id uuid;
begin
  select * into target from public.attendance_sessions where id=target_session_id for update;
  if not found or target.scope_type<>'general' or target.status<>'active' then raise exception 'Active General session required' using errcode='55000'; end if;
  if not public.is_event_super_organiser(target.event_id,caller_id) then raise exception 'Super organiser permission required' using errcode='42501'; end if;
  if not public.is_active_event_member(target.event_id,target_user_id) then raise exception 'Volunteer must be an active event member' using errcode='22023'; end if;
  select id into unit_id from public.attendance_units where session_id=target.id and unit_type='event';
  if not allow_scan and not allow_manual then delete from public.attendance_unit_operators where attendance_unit_id=unit_id and user_id=target_user_id;
  else insert into public.attendance_unit_operators(attendance_unit_id,user_id,assigned_by,can_scan,can_mark_manually)
    values(unit_id,target_user_id,caller_id,allow_scan,allow_manual) on conflict(attendance_unit_id,user_id)
    do update set can_scan=excluded.can_scan,can_mark_manually=excluded.can_mark_manually,assigned_by=caller_id; end if;
  perform public.write_haajar_audit(target.event_id,null,caller_id,'attendance_session',target.id,
    'attendance_session.operator_changed',null,null,jsonb_build_object('operator_user_id',target_user_id,
      'can_scan',allow_scan,'can_mark_manually',allow_manual));
  return true;
end $$;

create or replace function public.get_active_roll_call(target_group_id uuid)
returns table(roll_call_id uuid,session_id uuid,attendance_unit_id uuid,event_id uuid,group_id uuid,
  scope_type text,title text,status text,started_at timestamptz,created_by uuid,total_roster bigint,
  present_count bigint,remaining_count bigint,caller_can_scan boolean,caller_can_manage boolean)
language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target_group public.groups%rowtype; target_session public.attendance_sessions%rowtype;
  target_unit public.attendance_units%rowtype; can_view boolean;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into target_group from public.groups where id=target_group_id;
  if not found then raise exception 'Group not found' using errcode='P0002'; end if;
  if target_group.group_kind='category' then
    select * into target_session from public.attendance_sessions s where s.category_group_id=target_group.id and s.status='active';
    if not found then return; end if;
    can_view:=public.is_event_super_organiser(target_group.event_id,caller_id);
    if not can_view then raise exception 'Category attendance permission required' using errcode='42501'; end if;
    roll_call_id:=target_session.id; session_id:=target_session.id; attendance_unit_id:=null;
    event_id:=target_session.event_id; group_id:=target_group.id; scope_type:='category';
    title:=target_session.title; status:=target_session.status; started_at:=target_session.started_at; created_by:=target_session.started_by;
  else
    select u.* into target_unit from public.attendance_units u join public.attendance_sessions s on s.id=u.session_id
      where u.group_id=target_group.id and u.status='active' and s.status='active';
    if not found then return; end if;
    select * into target_session from public.attendance_sessions where id=target_unit.session_id;
    can_view:=public.is_attendance_unit_operator(target_unit.id,caller_id)
      or exists(select 1 from public.attendance_unit_roster r where r.attendance_unit_id=target_unit.id and r.user_id=caller_id);
    if not can_view then raise exception 'Attendance unit permission required' using errcode='42501'; end if;
    roll_call_id:=target_unit.id; session_id:=target_session.id; attendance_unit_id:=target_unit.id;
    event_id:=target_unit.event_id; group_id:=target_unit.group_id; scope_type:='subgroup';
    title:=target_session.title; status:=target_unit.status; started_at:=target_unit.started_at; created_by:=target_session.started_by;
  end if;
  total_roster:=(select count(*) from public.attendance_unit_roster r where r.session_id=target_session.id
    and (get_active_roll_call.attendance_unit_id is null
      or r.attendance_unit_id=get_active_roll_call.attendance_unit_id));
  present_count:=(select count(*) from public.attendance_records a where a.session_id=target_session.id
    and (get_active_roll_call.attendance_unit_id is null
      or a.attendance_unit_id=get_active_roll_call.attendance_unit_id));
  remaining_count:=total_roster-present_count;
  caller_can_scan:=get_active_roll_call.attendance_unit_id is not null and exists(select 1 from public.attendance_unit_operators o
    where o.attendance_unit_id=get_active_roll_call.attendance_unit_id and o.user_id=caller_id and o.can_scan);
  caller_can_manage:=public.is_event_super_organiser(target_session.event_id,caller_id);
  return next;
end $$;

create or replace function private.record_unit_attendance(target_unit_id uuid,target_roster_id uuid,
  target_method text,target_operation_id uuid,target_actor uuid)
returns table(result_status text,attendance_record_id uuid,membership_id uuid,member_user_id uuid,
  marked_at timestamptz,marking_method text)
language plpgsql volatile security definer set search_path = '' as $$
declare unit public.attendance_units%rowtype; session_row public.attendance_sessions%rowtype;
  roster public.attendance_unit_roster%rowtype; inserted public.attendance_records%rowtype; existing public.attendance_records%rowtype;
begin
  select * into unit from public.attendance_units where id=target_unit_id for update;
  if not found then result_status:='not_found'; return next; return; end if;
  select * into session_row from public.attendance_sessions where id=unit.session_id for share;
  if unit.status<>'active' or session_row.status<>'active' then result_status:='closed'; return next; return; end if;
  select * into roster from public.attendance_unit_roster where id=target_roster_id and attendance_unit_id=unit.id for share;
  if not found then result_status:='not_rostered'; return next; return; end if;
  select * into existing from public.attendance_records where attendance_unit_id=unit.id and roster_entry_id=roster.id;
  if found then result_status:='already_marked'; attendance_record_id:=existing.id;
    membership_id:=coalesce(roster.group_membership_id,roster.event_member_id);member_user_id:=roster.user_id;
    marked_at:=existing.marked_at;marking_method:=existing.marking_method;return next;return; end if;
  insert into public.attendance_records(attendance_unit_id,session_id,event_id,roster_entry_id,user_id,
    marked_by,marking_method,client_operation_id)
    values(unit.id,unit.session_id,unit.event_id,roster.id,roster.user_id,target_actor,target_method,target_operation_id)
    on conflict(client_operation_id) do nothing returning * into inserted;
  if inserted.id is null then select * into inserted from public.attendance_records where client_operation_id=target_operation_id; end if;
  result_status:=case when inserted.roster_entry_id=roster.id then 'marked_present' else 'invalid' end;
  attendance_record_id:=inserted.id;membership_id:=coalesce(roster.group_membership_id,roster.event_member_id);
  member_user_id:=roster.user_id;marked_at:=inserted.marked_at;marking_method:=inserted.marking_method;
  return next;
exception when unique_violation then
  select * into existing from public.attendance_records where attendance_unit_id=unit.id and roster_entry_id=roster.id;
  result_status:='already_marked';attendance_record_id:=existing.id;membership_id:=coalesce(roster.group_membership_id,roster.event_member_id);
  member_user_id:=roster.user_id;marked_at:=existing.marked_at;marking_method:=existing.marking_method;return next;
end $$;

create or replace function public.mark_attendance_present(target_roll_call_id uuid,presented_token text,
  marking_method text,client_operation_id uuid)
returns table(result_status text,attendance_record_id uuid,membership_id uuid,member_user_id uuid,
  marked_at timestamptz,resolved_marking_method text)
language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); unit public.attendance_units%rowtype; operator public.attendance_unit_operators%rowtype;
  canonical text; payload_version integer; credential public.qr_credentials%rowtype;
  membership public.group_memberships%rowtype; roster_id uuid;
begin
  select * into unit from public.attendance_units where id=target_roll_call_id;
  if not found then raise exception 'Attendance unit not found' using errcode='P0002'; end if;
  select * into operator from public.attendance_unit_operators where attendance_unit_id=unit.id and user_id=caller_id;
  if not public.is_event_super_organiser(unit.event_id,caller_id) and (operator.user_id is null or not operator.can_scan) then
    raise exception 'Attendance scanner permission required' using errcode='42501'; end if;
  canonical:=lower(btrim(coalesce(presented_token,'')));
  if canonical ~ '^hjr:[1-9][0-9]{0,8}:[a-f0-9]{64}$' then payload_version:=split_part(canonical,':',2)::integer;canonical:=split_part(canonical,':',3);
  elsif canonical ~ '^[a-f0-9]{64}$' then payload_version:=null; else result_status:='invalid';return next;return; end if;
  select * into credential from public.qr_credentials where token_hash=encode(extensions.digest(canonical,'sha256'),'hex') for share;
  if not found then result_status:='invalid';return next;return; end if;
  if credential.status<>'active' then result_status:='revoked';return next;return; end if;
  if payload_version is not null and payload_version<>credential.version then result_status:='invalid';return next;return; end if;
  select * into membership from public.group_memberships where id=credential.group_membership_id for share;
  if membership.status<>'active' then result_status:='inactive_membership';return next;return; end if;
  if unit.group_id is not null and membership.group_id<>unit.group_id then result_status:='wrong_group';return next;return; end if;
  select id into roster_id from public.attendance_unit_roster where attendance_unit_id=unit.id and user_id=membership.user_id;
  if roster_id is null then result_status:='not_rostered';return next;return; end if;
  return query select r.result_status,r.attendance_record_id,r.membership_id,r.member_user_id,r.marked_at,r.marking_method
    from private.record_unit_attendance(unit.id,roster_id,'qr',client_operation_id,caller_id) r;
end $$;

create or replace function public.mark_attendance_manual(target_roll_call_id uuid,target_membership_id uuid,client_operation_id uuid)
returns table(result_status text,attendance_record_id uuid,membership_id uuid,member_user_id uuid,
  marked_at timestamptz,marking_method text)
language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); unit public.attendance_units%rowtype; operator public.attendance_unit_operators%rowtype; roster_id uuid;
begin
  select * into unit from public.attendance_units where id=target_roll_call_id;
  if not found then raise exception 'Attendance unit not found' using errcode='P0002'; end if;
  select * into operator from public.attendance_unit_operators where attendance_unit_id=unit.id and user_id=caller_id;
  if not public.is_event_super_organiser(unit.event_id,caller_id) and (operator.user_id is null or not operator.can_mark_manually) then
    raise exception 'Manual attendance permission required' using errcode='42501'; end if;
  select id into roster_id from public.attendance_unit_roster where attendance_unit_id=unit.id
    and (id=target_membership_id or group_membership_id=target_membership_id or event_member_id=target_membership_id);
  if roster_id is null then result_status:='not_rostered';return next;return; end if;
  return query select * from private.record_unit_attendance(unit.id,roster_id,'manual',client_operation_id,caller_id);
end $$;

create or replace function public.close_roll_call(target_roll_call_id uuid)
returns table(roll_call_id uuid,total_roster bigint,present_count bigint,remaining_count bigint,closed_at timestamptz)
language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); session_row public.attendance_sessions%rowtype;
begin
  select s.* into session_row from public.attendance_sessions s where s.id=target_roll_call_id for update;
  if not found then select s.* into session_row from public.attendance_units u join public.attendance_sessions s on s.id=u.session_id
    where u.id=target_roll_call_id for update of s; end if;
  if not found then raise exception 'Attendance session not found' using errcode='P0002'; end if;
  if not public.is_event_super_organiser(session_row.event_id,caller_id) then raise exception 'Super organiser permission required' using errcode='42501'; end if;
  if session_row.status='active' then
    update public.attendance_units set status='closed',closed_at=now() where session_id=session_row.id and status='active';
    update public.attendance_sessions set status='closed',closed_at=now(),closed_by=caller_id where id=session_row.id
      returning attendance_sessions.closed_at into session_row.closed_at;
    perform public.write_haajar_audit(session_row.event_id,session_row.category_group_id,caller_id,'attendance_session',session_row.id,
      'attendance_session.closed',jsonb_build_object('status','active'),jsonb_build_object('status','closed'),null);
  end if;
  roll_call_id:=session_row.id;total_roster:=(select count(*) from public.attendance_unit_roster where session_id=session_row.id);
  present_count:=(select count(*) from public.attendance_records where session_id=session_row.id);
  remaining_count:=total_roster-present_count;closed_at:=session_row.closed_at;return next;
end $$;

revoke all on function private.record_unit_attendance(uuid,uuid,text,uuid,uuid) from public,anon,authenticated;
revoke all on function public.create_general_attendance_session(uuid,text,text,jsonb),
  public.create_category_attendance_session(uuid,text,text),public.create_roll_call(uuid,text,text),
  public.set_general_attendance_operator(uuid,uuid,boolean,boolean),public.get_active_roll_call(uuid),
  public.mark_attendance_present(uuid,text,text,uuid),public.mark_attendance_manual(uuid,uuid,uuid),
  public.close_roll_call(uuid) from public,anon,authenticated;
grant execute on function public.create_general_attendance_session(uuid,text,text,jsonb),
  public.create_category_attendance_session(uuid,text,text),public.create_roll_call(uuid,text,text),
  public.set_general_attendance_operator(uuid,uuid,boolean,boolean),public.get_active_roll_call(uuid),
  public.mark_attendance_present(uuid,text,text,uuid),public.mark_attendance_manual(uuid,uuid,uuid),
  public.close_roll_call(uuid) to authenticated;

commit;
