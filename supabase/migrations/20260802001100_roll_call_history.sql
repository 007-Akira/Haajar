begin;

create or replace function public.get_roll_call_history(target_group_id uuid)
returns table (
  roll_call_id uuid,
  event_id uuid,
  group_id uuid,
  title text,
  status text,
  started_at timestamptz,
  closed_at timestamptz,
  created_by uuid,
  created_by_name text,
  total_roster bigint,
  present_count bigint,
  remaining_count bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_group public.groups%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into target_group
  from public.groups
  where id = target_group_id;
  if not found then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  if not public.is_active_group_member(target_group.id, caller_id)
    and not public.is_event_super_organiser(target_group.event_id, caller_id) then
    raise exception 'Roll-call history permission required' using errcode = '42501';
  end if;

  return query
  select
    roll_call.id,
    roll_call.event_id,
    roll_call.group_id,
    roll_call.title,
    roll_call.status,
    roll_call.started_at,
    roll_call.closed_at,
    roll_call.created_by,
    coalesce(nullif(btrim(creator.full_name), ''), 'Organiser'),
    (select count(*) from public.roll_call_roster_members as roster
      where roster.roll_call_id = roll_call.id),
    (select count(*) from public.attendance_records as attendance
      where attendance.roll_call_id = roll_call.id),
    (select count(*) from public.roll_call_roster_members as roster
      where roster.roll_call_id = roll_call.id)
      - (select count(*) from public.attendance_records as attendance
        where attendance.roll_call_id = roll_call.id)
  from public.roll_calls as roll_call
  join public.profiles as creator on creator.id = roll_call.created_by
  where roll_call.group_id = target_group.id
  order by roll_call.started_at desc, roll_call.id desc;
end;
$$;

create or replace function public.get_roll_call_dashboard(target_roll_call_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_roll_call public.roll_calls%rowtype;
  can_operate boolean;
  total_count bigint;
  marked_count bigint;
  member_filter uuid;
  creator_name text;
  closer_name text;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into target_roll_call
  from public.roll_calls
  where id = target_roll_call_id;
  if not found then
    raise exception 'Roll call not found' using errcode = 'P0002';
  end if;
  if not public.is_active_group_member(target_roll_call.group_id, caller_id)
    and not public.is_event_super_organiser(target_roll_call.event_id, caller_id) then
    raise exception 'Roll-call access permission required' using errcode = '42501';
  end if;

  can_operate := public.is_group_attendance_operator(target_roll_call.group_id, caller_id);
  member_filter := case when can_operate then null else caller_id end;
  select coalesce(nullif(btrim(full_name), ''), 'Organiser') into creator_name
  from public.profiles where id = target_roll_call.created_by;
  select coalesce(nullif(btrim(full_name), ''), 'Organiser') into closer_name
  from public.profiles where id = target_roll_call.closed_by;
  select count(*) into total_count
  from public.roll_call_roster_members as roster
  where roster.roll_call_id = target_roll_call.id;
  select count(*) into marked_count
  from public.attendance_records as attendance
  where attendance.roll_call_id = target_roll_call.id;

  return jsonb_build_object(
    'roll_call', jsonb_build_object(
      'id', target_roll_call.id,
      'event_id', target_roll_call.event_id,
      'group_id', target_roll_call.group_id,
      'title', target_roll_call.title,
      'note', case when can_operate then target_roll_call.note else null end,
      'status', target_roll_call.status,
      'started_at', target_roll_call.started_at,
      'closed_at', target_roll_call.closed_at,
      'created_by', case when can_operate then target_roll_call.created_by else null end,
      'created_by_name', case when can_operate then creator_name else null end,
      'closed_by_name', case when can_operate then closer_name else null end
    ),
    'counts', jsonb_build_object(
      'total_roster', total_count,
      'present', marked_count,
      'remaining', total_count - marked_count
    ),
    'present_members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', roster.membership_id,
        'user_id', roster.user_id,
        'display_name', profile.full_name,
        'phone', case when can_operate then profile.phone else null end,
        'role', roster.role_at_start,
        'status', 'present',
        'marked_at', attendance.marked_at,
        'marking_method', case when can_operate then attendance.marking_method else null end,
        'marked_by', case when can_operate then attendance.marked_by else null end,
        'marked_by_name', case when can_operate then marker.full_name else null end
      ) order by attendance.marked_at)
      from public.roll_call_roster_members as roster
      join public.profiles as profile on profile.id = roster.user_id
      join public.attendance_records as attendance
        on attendance.roll_call_id = roster.roll_call_id
       and attendance.membership_id = roster.membership_id
      left join public.profiles as marker on marker.id = attendance.marked_by
      where roster.roll_call_id = target_roll_call.id
        and (member_filter is null or roster.user_id = member_filter)
    ), '[]'::jsonb),
    'remaining_members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', roster.membership_id,
        'user_id', roster.user_id,
        'display_name', profile.full_name,
        'phone', case when can_operate then profile.phone else null end,
        'role', roster.role_at_start,
        'status', case when target_roll_call.status = 'closed' then 'absent' else 'unmarked' end
      ) order by profile.full_name)
      from public.roll_call_roster_members as roster
      join public.profiles as profile on profile.id = roster.user_id
      left join public.attendance_records as attendance
        on attendance.roll_call_id = roster.roll_call_id
       and attendance.membership_id = roster.membership_id
      where roster.roll_call_id = target_roll_call.id
        and attendance.id is null
        and (member_filter is null or roster.user_id = member_filter)
    ), '[]'::jsonb),
    'permissions', jsonb_build_object(
      'can_scan', can_operate,
      'can_mark_manually', public.is_group_manager(target_roll_call.group_id, caller_id),
      'can_close', public.is_group_manager(target_roll_call.group_id, caller_id),
      'can_view_full_history', can_operate
    )
  );
end;
$$;

revoke all on function public.get_roll_call_history(uuid)
  from public, anon, authenticated;
revoke all on function public.get_roll_call_dashboard(uuid)
  from public, anon, authenticated;
grant execute on function public.get_roll_call_history(uuid) to authenticated;
grant execute on function public.get_roll_call_dashboard(uuid) to authenticated;

commit;
