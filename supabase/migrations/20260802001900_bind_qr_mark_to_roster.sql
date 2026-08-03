begin;

create or replace function public.mark_attendance_roster_present(
  attendance_unit_id uuid,
  roster_entry_id uuid,
  presented_token text,
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
  resolution record;
  outcome record;
begin
  if caller_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select * into unit_record
  from public.attendance_units as attendance_unit
  where attendance_unit.id = mark_attendance_roster_present.attendance_unit_id
  for share;

  if not found then
    result_status := 'not_found';
    return next;
    return;
  end if;

  -- Resolve the credential again at confirmation time. This binds the selected
  -- roster row to the presented credential instead of trusting a client-supplied
  -- roster identifier on its own.
  select * into resolution
  from public.resolve_attendance_qr(
    mark_attendance_roster_present.presented_token,
    unit_record.id
  );

  if resolution.resolution_status <> 'valid' then
    result_status := case resolution.resolution_status
      when 'closed_unit' then 'closed'
      when 'wrong_unit' then 'not_rostered'
      when 'wrong_group' then 'not_rostered'
      when 'not_in_roster' then 'not_rostered'
      else 'invalid_qr'
    end;
    return next;
    return;
  end if;

  if resolution.roster_entry_id is distinct from mark_attendance_roster_present.roster_entry_id then
    perform public.write_haajar_audit(
      unit_record.event_id,
      unit_record.group_id,
      caller_id,
      'attendance_unit',
      unit_record.id,
      'attendance.qr_roster_substitution_rejected',
      null,
      null,
      jsonb_build_object('resolution_status', 'roster_mismatch')
    );
    result_status := 'not_rostered';
    return next;
    return;
  end if;

  select * into outcome
  from private.record_unit_attendance(
    unit_record.id,
    resolution.roster_entry_id,
    'qr',
    mark_attendance_roster_present.client_operation_id,
    caller_id
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
    coalesce(attendance_record_id, resolution.roster_entry_id),
    case when result_status = 'already_marked'
      then 'attendance.qr_already_marked' else 'attendance.qr_marked' end,
    null,
    jsonb_build_object('result_status', result_status),
    jsonb_build_object(
      'attendance_unit_id', unit_record.id,
      'roster_entry_id', resolution.roster_entry_id
    )
  );
  return next;
end $$;

revoke all on function public.mark_attendance_roster_present(uuid, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.mark_attendance_roster_present(uuid, uuid, text, uuid)
  to authenticated;

revoke all on function public.mark_attendance_roster_present(uuid, uuid, uuid)
  from public, anon, authenticated;
drop function public.mark_attendance_roster_present(uuid, uuid, uuid);

commit;
