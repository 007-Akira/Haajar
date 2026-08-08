begin;

create or replace function public.get_general_attendance_history(target_event_id uuid)
returns table(
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
declare caller_id uuid := auth.uid();
begin
  if caller_id is null or not public.is_active_event_member(target_event_id, caller_id) then
    raise exception 'General attendance history permission required' using errcode = '42501';
  end if;

  return query
  select session.id,
    session.event_id,
    target_event_id,
    session.title,
    session.status,
    session.started_at,
    session.closed_at,
    session.started_by,
    coalesce(nullif(btrim(profile.full_name), ''), 'Organiser'),
    (select count(*) from public.attendance_unit_roster roster where roster.session_id = session.id),
    (select count(*) from public.attendance_records record where record.session_id = session.id),
    (select count(*) from public.attendance_unit_roster roster where roster.session_id = session.id)
      - (select count(*) from public.attendance_records record where record.session_id = session.id)
  from public.attendance_sessions session
  join public.profiles profile on profile.id = session.started_by
  where session.event_id = target_event_id and session.scope_type = 'general'
  order by session.started_at desc, session.id desc;
end;
$$;

revoke all on function public.get_general_attendance_history(uuid)
  from public, anon, authenticated;
grant execute on function public.get_general_attendance_history(uuid) to authenticated;

commit;
