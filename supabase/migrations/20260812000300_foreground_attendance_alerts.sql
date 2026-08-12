begin;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname='supabase_realtime' and schemaname='public' and tablename='attendance_sessions'
  ) then
    alter publication supabase_realtime add table public.attendance_sessions;
  end if;
end $$;

create or replace function public.get_attendance_alert_context(target_session_id uuid)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare target public.attendance_sessions%rowtype; target_group public.groups%rowtype;
  target_event public.events%rowtype; route text; scope_name text;
begin
  if auth.uid() is null or not public.can_view_attendance_session(target_session_id,auth.uid()) then
    raise exception 'Attendance access required' using errcode='42501';
  end if;
  select * into target from public.attendance_sessions where id=target_session_id;
  if not found then raise exception 'Attendance session not found' using errcode='P0002'; end if;
  select * into target_event from public.events where id=target.event_id;
  if target.scope_type='general' then
    scope_name:=target_event.name;
    route:='/events/'||target.event_id||'/attendance/general/'||target.id;
  else
    select * into target_group from public.groups where id=target.category_group_id;
    scope_name:=target_group.name;
    route:='/events/'||target.event_id||'/groups/'||target.category_group_id||'/roll-calls/'||target.id;
  end if;
  return jsonb_build_object('session_id',target.id,'group_id',target.category_group_id,
    'scope_name',scope_name,'route',route,'status',target.status);
end $$;

revoke all on function public.get_attendance_alert_context(uuid) from public,anon,authenticated;
grant execute on function public.get_attendance_alert_context(uuid) to authenticated;

commit;
