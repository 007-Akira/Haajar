begin;

create or replace function public.create_roll_call(
  target_group_id uuid,
  roll_call_title text,
  roll_call_note text default null
)
returns uuid
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_group public.groups%rowtype;
  target_event public.events%rowtype;
  new_roll_call_id uuid;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if nullif(btrim(roll_call_title), '') is null then
    raise exception 'Roll-call title is required' using errcode = '22023';
  end if;
  if length(btrim(roll_call_title)) > 160
    or length(coalesce(roll_call_note, '')) > 2000 then
    raise exception 'Roll-call content is too long' using errcode = '22023';
  end if;

  select * into target_group
  from public.groups
  where id = target_group_id
  for share;
  if not found then
    raise exception 'Group not found' using errcode = 'P0002';
  end if;

  select * into target_event
  from public.events
  where id = target_group.event_id
  for share;

  if not public.is_group_manager(target_group.id, caller_id) then
    raise exception 'Roll-call creation permission required' using errcode = '42501';
  end if;
  if target_group.status <> 'active' or target_event.status <> 'active' then
    raise exception 'Archived groups or events cannot start roll calls'
      using errcode = '55000';
  end if;
  if exists (
    select 1 from public.roll_calls
    where group_id = target_group.id and status = 'active'
  ) then
    raise exception 'An active roll call already exists for this group'
      using errcode = '23505';
  end if;

  insert into public.roll_calls (
    event_id, group_id, created_by, title, note, status, started_at
  ) values (
    target_event.id,
    target_group.id,
    caller_id,
    btrim(roll_call_title),
    nullif(btrim(roll_call_note), ''),
    'active',
    now()
  ) returning id into new_roll_call_id;

  insert into public.roll_call_roster_members (
    roll_call_id, event_id, group_id, membership_id, user_id, role_at_start
  )
  select
    new_roll_call_id,
    target_event.id,
    target_group.id,
    membership.id,
    membership.user_id,
    membership.role
  from public.group_memberships as membership
  where membership.group_id = target_group.id
    and membership.status = 'active';

  perform public.write_haajar_audit(
    target_event.id,
    target_group.id,
    caller_id,
    'roll_call',
    new_roll_call_id,
    'roll_call.created',
    null,
    jsonb_build_object(
      'status', 'active',
      'roster_count', (
        select count(*) from public.roll_call_roster_members as roster
        where roster.roll_call_id = new_roll_call_id
      )
    )
  );

  return new_roll_call_id;
exception
  when unique_violation then
    raise exception 'An active roll call already exists for this group'
      using errcode = '23505';
end;
$$;

create or replace function public.get_active_roll_call(target_group_id uuid)
returns table (
  roll_call_id uuid,
  event_id uuid,
  group_id uuid,
  title text,
  status text,
  started_at timestamptz,
  created_by uuid,
  total_roster bigint,
  present_count bigint,
  remaining_count bigint,
  caller_can_scan boolean,
  caller_can_manage boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_roll_call public.roll_calls%rowtype;
  can_operate boolean;
  can_manage boolean;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if not public.is_active_group_member(target_group_id, caller_id)
    and not exists (
      select 1 from public.groups as target_group
      where target_group.id = target_group_id
        and public.is_event_super_organiser(target_group.event_id, caller_id)
    ) then
    raise exception 'Active group participation required' using errcode = '42501';
  end if;

  select * into target_roll_call
  from public.roll_calls
  where public.roll_calls.group_id = target_group_id
    and public.roll_calls.status = 'active';
  if not found then return; end if;

  can_operate := public.is_group_attendance_operator(target_group_id, caller_id);
  can_manage := public.is_group_manager(target_group_id, caller_id);

  roll_call_id := target_roll_call.id;
  event_id := target_roll_call.event_id;
  group_id := target_roll_call.group_id;
  title := target_roll_call.title;
  status := target_roll_call.status;
  started_at := target_roll_call.started_at;
  created_by := case when can_operate then target_roll_call.created_by else null end;
  total_roster := case when can_operate then (
    select count(*) from public.roll_call_roster_members as roster
    where roster.roll_call_id = target_roll_call.id
  ) else null end;
  present_count := case when can_operate then (
    select count(*) from public.attendance_records as attendance
    where attendance.roll_call_id = target_roll_call.id
  ) else null end;
  remaining_count := case when can_operate then total_roster - present_count else null end;
  caller_can_scan := can_operate;
  caller_can_manage := can_manage;
  return next;
end;
$$;

create or replace function private.record_present_attendance(
  target_roll_call_id uuid,
  target_membership_id uuid,
  target_marking_method text,
  target_client_operation_id uuid,
  target_actor_id uuid
)
returns table (
  result_status text,
  attendance_record_id uuid,
  membership_id uuid,
  member_user_id uuid,
  marked_at timestamptz,
  marking_method text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  target_roll_call public.roll_calls%rowtype;
  target_group public.groups%rowtype;
  target_event public.events%rowtype;
  roster_member public.roll_call_roster_members%rowtype;
  live_membership public.group_memberships%rowtype;
  inserted_record public.attendance_records%rowtype;
begin
  select * into target_roll_call
  from public.roll_calls
  where id = target_roll_call_id
  for update;
  if not found then
    result_status := 'not_found';
    return next;
    return;
  end if;
  if target_roll_call.status <> 'active' then
    perform public.write_haajar_audit(
      target_roll_call.event_id, target_roll_call.group_id, target_actor_id,
      'roll_call', target_roll_call.id, 'attendance.mark_failed',
      null, null, jsonb_build_object('reason', 'closed')
    );
    result_status := 'closed';
    return next;
    return;
  end if;
  select * into target_group from public.groups
  where id = target_roll_call.group_id;
  select * into target_event from public.events
  where id = target_roll_call.event_id;
  if target_group.status <> 'active' or target_event.status <> 'active' then
    perform public.write_haajar_audit(
      target_roll_call.event_id, target_roll_call.group_id, target_actor_id,
      'roll_call', target_roll_call.id, 'attendance.mark_failed',
      null, null, jsonb_build_object('reason', 'archived')
    );
    result_status := 'archived';
    return next;
    return;
  end if;

  select * into roster_member
  from public.roll_call_roster_members as roster
  where roster.roll_call_id = target_roll_call.id
    and roster.membership_id = target_membership_id;
  if not found then
    perform public.write_haajar_audit(
      target_roll_call.event_id, target_roll_call.group_id, target_actor_id,
      'roll_call', target_roll_call.id, 'attendance.mark_failed',
      null, null, jsonb_build_object('reason', 'not_rostered')
    );
    result_status := 'not_rostered';
    return next;
    return;
  end if;

  select * into live_membership
  from public.group_memberships
  where id = roster_member.membership_id
    and group_id = target_roll_call.group_id
  for share;
  if not found or live_membership.status <> 'active' then
    perform public.write_haajar_audit(
      target_roll_call.event_id, target_roll_call.group_id, target_actor_id,
      'group_membership', roster_member.membership_id, 'attendance.mark_failed',
      null, null, jsonb_build_object('reason', 'inactive_membership')
    );
    result_status := 'inactive_membership';
    membership_id := roster_member.membership_id;
    member_user_id := roster_member.user_id;
    return next;
    return;
  end if;

  insert into public.attendance_records (
    roll_call_id, event_id, group_id, membership_id, user_id,
    marked_by, marking_method, client_operation_id
  ) values (
    target_roll_call.id,
    target_roll_call.event_id,
    target_roll_call.group_id,
    roster_member.membership_id,
    roster_member.user_id,
    target_actor_id,
    target_marking_method,
    target_client_operation_id
  )
  on conflict (roll_call_id, membership_id) do nothing
  returning * into inserted_record;

  if inserted_record.id is null then
    select * into inserted_record
    from public.attendance_records
    where roll_call_id = target_roll_call.id
      and public.attendance_records.membership_id = roster_member.membership_id;
    result_status := 'already_marked';
  else
    result_status := 'marked_present';
    perform public.write_haajar_audit(
      target_roll_call.event_id, target_roll_call.group_id, target_actor_id,
      'attendance_record', inserted_record.id, 'attendance.marked_present',
      null,
      jsonb_build_object(
        'roll_call_id', target_roll_call.id,
        'membership_id', roster_member.membership_id,
        'marking_method', target_marking_method
      )
    );
  end if;

  attendance_record_id := inserted_record.id;
  membership_id := roster_member.membership_id;
  member_user_id := roster_member.user_id;
  marked_at := inserted_record.marked_at;
  marking_method := inserted_record.marking_method;
  return next;
exception
  when unique_violation then
    select * into inserted_record
    from public.attendance_records
    where client_operation_id = target_client_operation_id;
    if inserted_record.roll_call_id <> target_roll_call_id
      or inserted_record.membership_id <> target_membership_id then
      raise exception 'Client operation ID was already used for another attendance record'
        using errcode = '23505';
    end if;
    result_status := 'already_marked';
    attendance_record_id := inserted_record.id;
    membership_id := inserted_record.membership_id;
    member_user_id := inserted_record.user_id;
    marked_at := inserted_record.marked_at;
    marking_method := inserted_record.marking_method;
    return next;
end;
$$;

create or replace function public.mark_attendance_present(
  target_roll_call_id uuid,
  presented_token text,
  marking_method text,
  client_operation_id uuid
)
returns table (
  result_status text,
  attendance_record_id uuid,
  membership_id uuid,
  member_user_id uuid,
  marked_at timestamptz,
  resolved_marking_method text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_roll_call public.roll_calls%rowtype;
  resolution record;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if marking_method <> 'qr' then
    raise exception 'QR marking method required' using errcode = '22023';
  end if;
  if client_operation_id is null then
    raise exception 'Client operation ID required' using errcode = '22023';
  end if;

  select * into target_roll_call
  from public.roll_calls
  where id = target_roll_call_id;
  if not found then
    raise exception 'Roll call not found' using errcode = 'P0002';
  end if;
  if not public.is_group_attendance_operator(target_roll_call.group_id, caller_id) then
    raise exception 'Attendance scanner permission required' using errcode = '42501';
  end if;
  if target_roll_call.status <> 'active' then
    return query select * from private.record_present_attendance(
      target_roll_call.id, null, 'qr', client_operation_id, caller_id
    );
    return;
  end if;

  select * into resolution
  from public.resolve_membership_qr(presented_token, target_roll_call.group_id);
  if resolution.resolution_status <> 'valid' then
    result_status := resolution.resolution_status;
    return next;
    return;
  end if;

  return query
  select marked.result_status, marked.attendance_record_id, marked.membership_id,
    marked.member_user_id, marked.marked_at, marked.marking_method
  from private.record_present_attendance(
    target_roll_call.id,
    resolution.membership_id,
    'qr',
    client_operation_id,
    caller_id
  ) as marked;
end;
$$;

create or replace function public.mark_attendance_manual(
  target_roll_call_id uuid,
  target_membership_id uuid,
  client_operation_id uuid
)
returns table (
  result_status text,
  attendance_record_id uuid,
  membership_id uuid,
  member_user_id uuid,
  marked_at timestamptz,
  marking_method text
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_roll_call public.roll_calls%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  if client_operation_id is null then
    raise exception 'Client operation ID required' using errcode = '22023';
  end if;
  select * into target_roll_call
  from public.roll_calls
  where id = target_roll_call_id;
  if not found then
    raise exception 'Roll call not found' using errcode = 'P0002';
  end if;
  if not public.is_group_manager(target_roll_call.group_id, caller_id) then
    raise exception 'Manual attendance permission required' using errcode = '42501';
  end if;

  return query select * from private.record_present_attendance(
    target_roll_call.id,
    target_membership_id,
    'manual',
    client_operation_id,
    caller_id
  );
end;
$$;

create or replace function public.close_roll_call(target_roll_call_id uuid)
returns table (
  roll_call_id uuid,
  total_roster bigint,
  present_count bigint,
  remaining_count bigint,
  closed_at timestamptz
)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  caller_id uuid := auth.uid();
  target_roll_call public.roll_calls%rowtype;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into target_roll_call
  from public.roll_calls
  where id = target_roll_call_id
  for update;
  if not found then
    raise exception 'Roll call not found' using errcode = 'P0002';
  end if;
  if not public.is_group_manager(target_roll_call.group_id, caller_id) then
    raise exception 'Roll-call closure permission required' using errcode = '42501';
  end if;

  if target_roll_call.status = 'active' then
    update public.roll_calls
    set status = 'closed', closed_at = now(), closed_by = caller_id
    where id = target_roll_call.id
    returning public.roll_calls.closed_at into target_roll_call.closed_at;

    perform public.write_haajar_audit(
      target_roll_call.event_id, target_roll_call.group_id, caller_id,
      'roll_call', target_roll_call.id, 'roll_call.closed',
      jsonb_build_object('status', 'active'),
      jsonb_build_object('status', 'closed')
    );
  end if;

  roll_call_id := target_roll_call.id;
  total_roster := (
    select count(*) from public.roll_call_roster_members as roster
    where roster.roll_call_id = target_roll_call.id
  );
  present_count := (
    select count(*) from public.attendance_records as attendance
    where attendance.roll_call_id = target_roll_call.id
  );
  remaining_count := total_roster - present_count;
  closed_at := target_roll_call.closed_at;
  return next;
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
      'created_by', case when can_operate then target_roll_call.created_by else null end
    ),
    'counts', case when can_operate then jsonb_build_object(
      'total_roster', total_count,
      'present', marked_count,
      'remaining', total_count - marked_count
    ) else null end,
    'present_members', coalesce((
      select jsonb_agg(jsonb_build_object(
        'membership_id', roster.membership_id,
        'user_id', roster.user_id,
        'display_name', profile.full_name,
        'phone', case when can_operate then profile.phone else null end,
        'role', roster.role_at_start,
        'status', 'present',
        'marked_at', attendance.marked_at,
        'marking_method', case when can_operate then attendance.marking_method else null end
      ) order by attendance.marked_at)
      from public.roll_call_roster_members as roster
      join public.profiles as profile on profile.id = roster.user_id
      join public.attendance_records as attendance
        on attendance.roll_call_id = roster.roll_call_id
       and attendance.membership_id = roster.membership_id
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
      'can_close', public.is_group_manager(target_roll_call.group_id, caller_id)
    )
  );
end;
$$;

revoke all on function private.record_present_attendance(uuid, uuid, text, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.create_roll_call(uuid, text, text)
  from public, anon, authenticated;
revoke all on function public.get_active_roll_call(uuid)
  from public, anon, authenticated;
revoke all on function public.mark_attendance_present(uuid, text, text, uuid)
  from public, anon, authenticated;
revoke all on function public.mark_attendance_manual(uuid, uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.close_roll_call(uuid)
  from public, anon, authenticated;
revoke all on function public.get_roll_call_dashboard(uuid)
  from public, anon, authenticated;

grant execute on function public.create_roll_call(uuid, text, text) to authenticated;
grant execute on function public.get_active_roll_call(uuid) to authenticated;
grant execute on function public.mark_attendance_present(uuid, text, text, uuid) to authenticated;
grant execute on function public.mark_attendance_manual(uuid, uuid, uuid) to authenticated;
grant execute on function public.close_roll_call(uuid) to authenticated;
grant execute on function public.get_roll_call_dashboard(uuid) to authenticated;

commit;
