begin;

alter table public.attendance_records drop constraint attendance_records_marking_method_check;
alter table public.attendance_records add constraint attendance_records_marking_method_check
  check (marking_method in ('qr', 'manual', 'offline_sync'));

create or replace function public.get_offline_roll_call_bundle(target_roll_call_id uuid)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); target public.roll_calls%rowtype; target_group public.groups%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  select * into target from public.roll_calls where id = target_roll_call_id for share;
  if not found then raise exception 'Roll call not found' using errcode = 'P0002'; end if;
  if not public.is_group_attendance_operator(target.group_id, caller_id) then
    raise exception 'Attendance scanner permission required' using errcode = '42501';
  end if;
  select * into target_group from public.groups where id = target.group_id;
  if target.status <> 'active' or target_group.status <> 'active'
    or not exists (select 1 from public.events where id = target.event_id and status = 'active') then
    raise exception 'Active roll call required' using errcode = '55000';
  end if;
  return jsonb_build_object(
    'roll_call_id', target.id, 'event_id', target.event_id, 'group_id', target.group_id,
    'generated_at', now(), 'expires_at', now() + interval '4 hours',
    'members', coalesce((select jsonb_agg(jsonb_build_object(
      'membership_id', roster.membership_id, 'user_id', roster.user_id,
      'display_name', profile.full_name, 'phone', profile.phone, 'role', roster.role_at_start,
      'credential_hash', credential.token_hash, 'credential_version', credential.version,
      'credential_status', credential.status
    ) order by profile.full_name)
    from public.roll_call_roster_members roster
    join public.group_memberships membership on membership.id = roster.membership_id
      and membership.status = 'active' and membership.group_id = target.group_id
    join public.profiles profile on profile.id = roster.user_id
    join public.qr_credentials credential on credential.group_membership_id = roster.membership_id
      and (credential.status = 'active' or credential.revoked_at >= now() - interval '4 hours')
    where roster.roll_call_id = target.id), '[]'::jsonb)
  );
end; $$;

create or replace function public.sync_offline_attendance(
  target_roll_call_id uuid, target_membership_id uuid,
  local_marked_at timestamptz, client_operation_id uuid
)
returns table(result_status text, attendance_record_id uuid, membership_id uuid,
  member_user_id uuid, marked_at timestamptz, marking_method text)
language plpgsql volatile security definer set search_path = '' as $$
declare caller_id uuid := auth.uid(); target public.roll_calls%rowtype;
begin
  if caller_id is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if client_operation_id is null or local_marked_at is null then
    raise exception 'Offline operation metadata required' using errcode = '22023';
  end if;
  select * into target from public.roll_calls where id = target_roll_call_id;
  if not found then raise exception 'Roll call not found' using errcode = 'P0002'; end if;
  if not public.is_group_attendance_operator(target.group_id, caller_id) then
    raise exception 'Attendance scanner permission required' using errcode = '42501';
  end if;
  if local_marked_at > now() + interval '5 minutes'
    or local_marked_at < target.started_at - interval '5 minutes' then
    raise exception 'Invalid offline marking time' using errcode = '22023';
  end if;
  return query select * from private.record_present_attendance(
    target.id, target_membership_id, 'offline_sync', client_operation_id, caller_id
  );
end; $$;

revoke all on function public.get_offline_roll_call_bundle(uuid),
  public.sync_offline_attendance(uuid, uuid, timestamptz, uuid) from public, anon, authenticated;
grant execute on function public.get_offline_roll_call_bundle(uuid),
  public.sync_offline_attendance(uuid, uuid, timestamptz, uuid) to authenticated;

commit;
