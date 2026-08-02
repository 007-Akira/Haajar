begin;

create or replace function public.get_offline_roll_call_bundle(target_roll_call_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); unit public.attendance_units%rowtype;
  session_row public.attendance_sessions%rowtype; operator public.attendance_unit_operators%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode='42501'; end if;
  select * into unit from public.attendance_units where id=target_roll_call_id for share;
  if not found then raise exception 'Attendance unit not found' using errcode='P0002'; end if;
  if unit.unit_type<>'subgroup' or unit.group_id is null then
    raise exception 'Offline attendance is available only for operational subgroups' using errcode='42501';
  end if;
  select * into operator from public.attendance_unit_operators where attendance_unit_id=unit.id and user_id=caller_id;
  if not public.is_event_super_organiser(unit.event_id,caller_id) and (operator.user_id is null or not operator.can_scan) then
    raise exception 'Attendance scanner permission required' using errcode='42501'; end if;
  select * into session_row from public.attendance_sessions where id=unit.session_id for share;
  if unit.status<>'active' or session_row.status<>'active' or not exists(select 1 from public.groups g
    where g.id=unit.group_id and g.group_kind='operational' and g.status='active') then
    raise exception 'Active subgroup attendance unit required' using errcode='55000'; end if;
  return jsonb_build_object('roll_call_id',unit.id,'session_id',unit.session_id,'event_id',unit.event_id,
    'group_id',unit.group_id,'generated_at',now(),'expires_at',least(now()+interval '4 hours',
      coalesce(session_row.closed_at,now()+interval '4 hours')),
    'members',coalesce((select jsonb_agg(jsonb_build_object('membership_id',r.group_membership_id,
      'roster_entry_id',r.id,'user_id',r.user_id,'display_name',r.display_name_snapshot,
      'phone',r.phone_snapshot,'role',r.role_snapshot,'credential_hash',q.token_hash,
      'credential_version',q.version,'credential_status',q.status) order by r.display_name_snapshot)
      from public.attendance_unit_roster r join public.qr_credentials q on q.group_membership_id=r.group_membership_id
      where r.attendance_unit_id=unit.id and (q.status='active' or q.revoked_at>=now()-interval '4 hours')),'[]'::jsonb));
end $$;

create or replace function public.sync_offline_attendance(target_roll_call_id uuid,target_membership_id uuid,
  local_marked_at timestamptz,client_operation_id uuid)
returns table(result_status text,attendance_record_id uuid,membership_id uuid,member_user_id uuid,
  marked_at timestamptz,marking_method text)
language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid(); unit public.attendance_units%rowtype;
  session_row public.attendance_sessions%rowtype; operator public.attendance_unit_operators%rowtype; roster_id uuid;
begin
  if client_operation_id is null or local_marked_at is null then raise exception 'Offline operation metadata required' using errcode='22023'; end if;
  select * into unit from public.attendance_units where id=target_roll_call_id;
  if not found or unit.unit_type<>'subgroup' then raise exception 'Subgroup attendance unit required' using errcode='42501'; end if;
  select * into operator from public.attendance_unit_operators where attendance_unit_id=unit.id and user_id=caller_id;
  if not public.is_event_super_organiser(unit.event_id,caller_id) and (operator.user_id is null or not operator.can_scan) then
    raise exception 'Attendance scanner permission required' using errcode='42501'; end if;
  select * into session_row from public.attendance_sessions where id=unit.session_id;
  if local_marked_at>now()+interval '5 minutes' or local_marked_at<session_row.started_at-interval '5 minutes' then
    raise exception 'Invalid offline marking time' using errcode='22023'; end if;
  select id into roster_id from public.attendance_unit_roster where attendance_unit_id=unit.id
    and group_membership_id=target_membership_id;
  if roster_id is null then result_status:='not_rostered';return next;return; end if;
  return query select * from private.record_unit_attendance(unit.id,roster_id,'offline_sync',client_operation_id,caller_id);
end $$;

revoke all on function public.get_offline_roll_call_bundle(uuid),
  public.sync_offline_attendance(uuid,uuid,timestamptz,uuid) from public,anon,authenticated;
grant execute on function public.get_offline_roll_call_bundle(uuid),
  public.sync_offline_attendance(uuid,uuid,timestamptz,uuid) to authenticated;

commit;
