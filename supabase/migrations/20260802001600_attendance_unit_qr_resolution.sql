begin;

create or replace function public.resolve_attendance_qr(
  presented_token text,
  attendance_unit_id uuid
)
returns table (
  resolution_status text,
  resolved_attendance_unit_id uuid,
  roster_entry_id uuid,
  member_user_id uuid,
  display_name text,
  phone text,
  role_snapshot text,
  source_group_id uuid,
  source_group_name text,
  already_marked boolean,
  marked_at timestamptz
)
language plpgsql volatile security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  unit_record public.attendance_units%rowtype;
  session_record public.attendance_sessions%rowtype;
  event_record public.events%rowtype;
  unit_group public.groups%rowtype;
  credential_record public.qr_credentials%rowtype;
  membership_record public.group_memberships%rowtype;
  credential_group public.groups%rowtype;
  roster_record public.attendance_unit_roster%rowtype;
  attendance_record public.attendance_records%rowtype;
  operator_can_scan boolean := false;
  canonical_token text;
  payload_version integer;
begin
  resolution_status := 'invalid_qr';
  resolved_attendance_unit_id := attendance_unit_id;
  roster_entry_id := null;
  member_user_id := null;
  display_name := null;
  phone := null;
  role_snapshot := null;
  source_group_id := null;
  source_group_name := null;
  already_marked := false;
  marked_at := null;

  if caller_id is null then
    resolution_status := 'unauthorised';
    return next;
    return;
  end if;

  select * into unit_record from public.attendance_units
    where id = attendance_unit_id for share;
  if not found then
    return next;
    return;
  end if;
  select * into session_record from public.attendance_sessions
    where id = unit_record.session_id for share;
  select * into event_record from public.events
    where id = unit_record.event_id for share;
  if unit_record.group_id is not null then
    select * into unit_group from public.groups where id = unit_record.group_id for share;
  end if;

  operator_can_scan := public.is_event_super_organiser(unit_record.event_id, caller_id)
    or exists(select 1 from public.attendance_unit_operators as operator
      where operator.attendance_unit_id = unit_record.id
        and operator.user_id = caller_id and operator.can_scan);
  if not operator_can_scan then
    resolution_status := 'unauthorised';
  elsif unit_record.status <> 'active' or session_record.status <> 'active' then
    resolution_status := 'closed_unit';
  elsif event_record.status <> 'active'
    or (unit_record.group_id is not null and unit_group.status <> 'active') then
    resolution_status := 'archived';
  else
    canonical_token := lower(btrim(coalesce(presented_token, '')));
    if canonical_token ~ '^hjr:[1-9][0-9]{0,8}:[a-f0-9]{64}$' then
      payload_version := split_part(canonical_token, ':', 2)::integer;
      canonical_token := split_part(canonical_token, ':', 3);
    elsif canonical_token ~ '^[a-f0-9]{64}$' then
      payload_version := null;
    else
      canonical_token := null;
    end if;

    if canonical_token is not null then
      select * into credential_record from public.qr_credentials
        where token_hash = encode(extensions.digest(canonical_token, 'sha256'), 'hex')
        for share;
      if found then
        select * into membership_record from public.group_memberships
          where id = credential_record.group_membership_id for share;
        select * into credential_group from public.groups
          where id = membership_record.group_id for share;

        if credential_record.status <> 'active' then
          resolution_status := 'revoked';
        elsif payload_version is not null and payload_version <> credential_record.version then
          resolution_status := 'invalid_qr';
        elsif membership_record.status <> 'active' then
          resolution_status := 'inactive_membership';
        elsif credential_group.event_id <> unit_record.event_id then
          resolution_status := 'wrong_unit';
        elsif credential_group.status <> 'active' then
          resolution_status := 'archived';
        elsif unit_record.unit_type = 'subgroup'
          and membership_record.group_id <> unit_record.group_id then
          resolution_status := 'wrong_group';
        else
          select * into roster_record from public.attendance_unit_roster
            where attendance_unit_id = unit_record.id
              and user_id = membership_record.user_id for share;
          if not found then
            resolution_status := 'not_in_roster';
          else
            select * into attendance_record from public.attendance_records
              where attendance_unit_id = unit_record.id
                and roster_entry_id = roster_record.id;
            resolution_status := 'valid';
            roster_entry_id := roster_record.id;
            member_user_id := roster_record.user_id;
            display_name := roster_record.display_name_snapshot;
            phone := roster_record.phone_snapshot;
            role_snapshot := roster_record.role_snapshot;
            source_group_id := roster_record.group_id;
            source_group_name := roster_record.source_group_name_snapshot;
            already_marked := attendance_record.id is not null;
            marked_at := attendance_record.marked_at;
          end if;
        end if;
      end if;
    end if;
  end if;

  perform public.write_haajar_audit(
    unit_record.event_id,
    unit_record.group_id,
    caller_id,
    'attendance_unit',
    unit_record.id,
    case when resolution_status = 'valid'
      then 'attendance_qr.resolved' else 'attendance_qr.resolution_failed' end,
    null,
    null,
    jsonb_build_object('resolution_status', resolution_status)
  );
  return next;
end $$;

create or replace function public.mark_attendance_roster_present(
  attendance_unit_id uuid,
  roster_entry_id uuid,
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
language plpgsql volatile security definer set search_path = '' as $$
declare
  caller_id uuid := auth.uid();
  unit_record public.attendance_units%rowtype;
  session_record public.attendance_sessions%rowtype;
  roster_record public.attendance_unit_roster%rowtype;
  operator_can_scan boolean := false;
  outcome record;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;
  select * into unit_record from public.attendance_units
    where id = attendance_unit_id for share;
  if not found then
    result_status := 'not_found'; return next; return;
  end if;
  select * into session_record from public.attendance_sessions
    where id = unit_record.session_id for share;
  operator_can_scan := public.is_event_super_organiser(unit_record.event_id, caller_id)
    or exists(select 1 from public.attendance_unit_operators as operator
      where operator.attendance_unit_id = unit_record.id
        and operator.user_id = caller_id and operator.can_scan);
  if not operator_can_scan then
    raise exception 'Attendance scanner permission required' using errcode = '42501';
  end if;
  if unit_record.status <> 'active' or session_record.status <> 'active' then
    result_status := 'closed'; return next; return;
  end if;
  select * into roster_record from public.attendance_unit_roster
    where id = roster_entry_id and attendance_unit_id = unit_record.id for share;
  if not found then
    result_status := 'not_rostered'; return next; return;
  end if;

  select * into outcome from private.record_unit_attendance(
    unit_record.id, roster_record.id, 'qr', client_operation_id, caller_id
  );
  result_status := outcome.result_status;
  attendance_record_id := outcome.attendance_record_id;
  membership_id := outcome.membership_id;
  member_user_id := outcome.member_user_id;
  marked_at := outcome.marked_at;
  marking_method := outcome.marking_method;
  perform public.write_haajar_audit(
    unit_record.event_id,
    unit_record.group_id,
    caller_id,
    'attendance_record',
    coalesce(attendance_record_id, roster_record.id),
    case when result_status = 'already_marked'
      then 'attendance.qr_already_marked' else 'attendance.qr_marked' end,
    null,
    jsonb_build_object('result_status', result_status),
    jsonb_build_object('attendance_unit_id', unit_record.id,
      'roster_entry_id', roster_record.id)
  );
  return next;
end $$;

revoke all on function public.resolve_attendance_qr(text, uuid),
  public.mark_attendance_roster_present(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.resolve_attendance_qr(text, uuid),
  public.mark_attendance_roster_present(uuid, uuid, uuid)
  to authenticated;

commit;
