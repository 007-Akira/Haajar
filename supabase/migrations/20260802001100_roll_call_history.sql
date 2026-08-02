begin;

create or replace function public.get_roll_call_dashboard(target_roll_call_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); session_row public.attendance_sessions%rowtype;
  unit_row public.attendance_units%rowtype; requested_unit_id uuid; can_aggregate boolean:=false;
  can_operate boolean:=false; can_manual boolean:=false; member_filter uuid; total_count bigint; present_count bigint;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into session_row from public.attendance_sessions where id=target_roll_call_id;
  if found then
    if session_row.scope_type='category' then
      can_aggregate:=public.is_event_super_organiser(session_row.event_id,caller_id);
      if not can_aggregate then raise exception 'Category aggregate permission required' using errcode='42501'; end if;
    else
      select * into unit_row from public.attendance_units where session_id=session_row.id and unit_type='event';
      requested_unit_id:=unit_row.id;
    end if;
  else
    select * into unit_row from public.attendance_units where id=target_roll_call_id;
    if not found then raise exception 'Attendance context not found' using errcode='P0002'; end if;
    requested_unit_id:=unit_row.id;
    select * into session_row from public.attendance_sessions where id=unit_row.session_id;
  end if;

  if requested_unit_id is not null then
    can_operate:=public.is_attendance_unit_operator(requested_unit_id,caller_id);
    can_manual:=public.is_event_super_organiser(session_row.event_id,caller_id) or exists(
      select 1 from public.attendance_unit_operators o where o.attendance_unit_id=requested_unit_id
        and o.user_id=caller_id and o.can_mark_manually);
    if not can_operate and not exists(select 1 from public.attendance_unit_roster r
      where r.attendance_unit_id=requested_unit_id and r.user_id=caller_id) then
      raise exception 'Attendance unit permission required' using errcode='42501';
    end if;
  else
    can_operate:=can_aggregate; can_manual:=false;
  end if;
  member_filter:=case when can_operate then null else caller_id end;
  select count(*) into total_count from public.attendance_unit_roster r where r.session_id=session_row.id
    and (requested_unit_id is null or r.attendance_unit_id=requested_unit_id)
    and (member_filter is null or r.user_id=member_filter);
  select count(*) into present_count from public.attendance_records a join public.attendance_unit_roster r on r.id=a.roster_entry_id
    where a.session_id=session_row.id and (requested_unit_id is null or a.attendance_unit_id=requested_unit_id)
    and (member_filter is null or r.user_id=member_filter);

  return jsonb_build_object(
    'roll_call',jsonb_build_object('id',coalesce(requested_unit_id,session_row.id),'session_id',session_row.id,
      'attendance_unit_id',requested_unit_id,'event_id',session_row.event_id,
      'group_id',coalesce(unit_row.group_id,session_row.category_group_id),'scope_type',
      case when requested_unit_id is not null and unit_row.unit_type='subgroup' then 'subgroup' else session_row.scope_type end,
      'title',session_row.title,'note',case when can_operate then session_row.note else null end,
      'status',case when requested_unit_id is null then session_row.status else unit_row.status end,
      'started_at',session_row.started_at,'closed_at',session_row.closed_at,'created_by',session_row.started_by,
      'created_by_name',(select coalesce(nullif(btrim(p.full_name),''),'Organiser') from public.profiles p where p.id=session_row.started_by),
      'closed_by_name',(select coalesce(nullif(btrim(p.full_name),''),'Organiser') from public.profiles p where p.id=session_row.closed_by)),
    'counts',jsonb_build_object('total_roster',total_count,'present',present_count,'remaining',total_count-present_count,
      'percentage',case when total_count=0 then 0 else round((present_count::numeric*100)/total_count,1) end),
    'units',case when can_aggregate then coalesce((select jsonb_agg(jsonb_build_object(
      'attendance_unit_id',u.id,'group_id',u.group_id,'group_name',coalesce(r.source_group_name_snapshot,g.name),
      'total_roster',(select count(*) from public.attendance_unit_roster ur where ur.attendance_unit_id=u.id),
      'present',(select count(*) from public.attendance_records ar where ar.attendance_unit_id=u.id),
      'remaining',(select count(*) from public.attendance_unit_roster ur where ur.attendance_unit_id=u.id)
        -(select count(*) from public.attendance_records ar where ar.attendance_unit_id=u.id)) order by g.name)
      from public.attendance_units u left join public.groups g on g.id=u.group_id
      left join lateral(select max(source_group_name_snapshot) source_group_name_snapshot
        from public.attendance_unit_roster where attendance_unit_id=u.id) r on true
      where u.session_id=session_row.id),'[]'::jsonb) else '[]'::jsonb end,
    'present_members',coalesce((select jsonb_agg(jsonb_build_object(
      'membership_id',coalesce(r.group_membership_id,r.event_member_id),'roster_entry_id',r.id,'user_id',r.user_id,
      'display_name',r.display_name_snapshot,'phone',case when can_operate then r.phone_snapshot else null end,
      'role',r.role_snapshot,'status','present','source_group_id',r.group_id,
      'source_group_name',r.source_group_name_snapshot,'marked_at',a.marked_at,
      'marking_method',case when can_operate then a.marking_method else null end,'marked_by',case when can_operate then a.marked_by else null end,
      'marked_by_name',case when can_operate then marker.full_name else null end) order by a.marked_at)
      from public.attendance_unit_roster r join public.attendance_records a on a.roster_entry_id=r.id
      left join public.profiles marker on marker.id=a.marked_by where r.session_id=session_row.id
      and (requested_unit_id is null or r.attendance_unit_id=requested_unit_id)
      and (member_filter is null or r.user_id=member_filter)),'[]'::jsonb),
    'remaining_members',coalesce((select jsonb_agg(jsonb_build_object(
      'membership_id',coalesce(r.group_membership_id,r.event_member_id),'roster_entry_id',r.id,'user_id',r.user_id,
      'display_name',r.display_name_snapshot,'phone',case when can_operate then r.phone_snapshot else null end,
      'role',r.role_snapshot,'status',case when session_row.status='closed' then 'absent' else 'unmarked' end,
      'source_group_id',r.group_id,'source_group_name',r.source_group_name_snapshot) order by r.source_group_name_snapshot,r.display_name_snapshot)
      from public.attendance_unit_roster r left join public.attendance_records a on a.roster_entry_id=r.id
      where r.session_id=session_row.id and a.id is null
      and (requested_unit_id is null or r.attendance_unit_id=requested_unit_id)
      and (member_filter is null or r.user_id=member_filter)),'[]'::jsonb),
    'permissions',jsonb_build_object('can_scan',requested_unit_id is not null and can_operate,
      'can_mark_manually',requested_unit_id is not null and can_manual,
      'can_close',public.is_event_super_organiser(session_row.event_id,caller_id),
      'can_view_full_history',can_operate,'can_view_aggregate',can_aggregate));
end $$;

create or replace function public.get_roll_call_history(target_group_id uuid)
returns table(roll_call_id uuid,event_id uuid,group_id uuid,title text,status text,started_at timestamptz,
  closed_at timestamptz,created_by uuid,created_by_name text,total_roster bigint,present_count bigint,remaining_count bigint)
language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); target_group public.groups%rowtype;
begin
  select * into target_group from public.groups where id=target_group_id;
  if not found then raise exception 'Group not found' using errcode='P0002'; end if;
  if target_group.group_kind='category' and not public.is_event_super_organiser(target_group.event_id,caller_id) then
    raise exception 'Category history permission required' using errcode='42501'; end if;
  if target_group.group_kind='operational' and not public.is_event_super_organiser(target_group.event_id,caller_id)
    and not public.is_active_group_member(target_group.id,caller_id) then raise exception 'Subgroup history permission required' using errcode='42501'; end if;
  return query select case when target_group.group_kind='category' then s.id else
      (select u.id from public.attendance_units u where u.session_id=s.id and u.group_id=target_group.id) end,
    s.event_id,target_group.id,s.title,s.status,s.started_at,s.closed_at,s.started_by,
    coalesce(nullif(btrim(p.full_name),''),'Organiser'),
    (select count(*) from public.attendance_unit_roster r where r.session_id=s.id
      and (target_group.group_kind='category' or r.group_id=target_group.id)),
    (select count(*) from public.attendance_records a join public.attendance_unit_roster r on r.id=a.roster_entry_id
      where a.session_id=s.id and (target_group.group_kind='category' or r.group_id=target_group.id)),
    (select count(*) from public.attendance_unit_roster r where r.session_id=s.id
      and (target_group.group_kind='category' or r.group_id=target_group.id))
      -(select count(*) from public.attendance_records a join public.attendance_unit_roster r on r.id=a.roster_entry_id
        where a.session_id=s.id and (target_group.group_kind='category' or r.group_id=target_group.id))
  from public.attendance_sessions s join public.profiles p on p.id=s.started_by
  where (target_group.group_kind='category' and s.category_group_id=target_group.id)
    or (target_group.group_kind='operational' and exists(select 1 from public.attendance_units u
      where u.session_id=s.id and u.group_id=target_group.id)) order by s.started_at desc,s.id desc;
end $$;

revoke all on function public.get_roll_call_dashboard(uuid),public.get_roll_call_history(uuid)
  from public,anon,authenticated;
grant execute on function public.get_roll_call_dashboard(uuid),public.get_roll_call_history(uuid) to authenticated;

commit;
