begin;

create or replace function public.get_event_delete_eligibility(target_event_id uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare caller_id uuid:=auth.uid();
begin
  if caller_id is null then return 'unauthorised'; end if;
  if not exists(select 1 from public.events where id=target_event_id) then return 'not_found'; end if;
  if not public.is_event_super_organiser(target_event_id,caller_id) then return 'unauthorised'; end if;
  if exists(select 1 from public.attendance_sessions where event_id=target_event_id and status='active') then return 'active_attendance'; end if;
  if exists(select 1 from public.attendance_sessions where event_id=target_event_id)
    or exists(select 1 from public.groups where event_id=target_event_id)
    or exists(select 1 from public.join_requests jr join public.groups g on g.id=jr.group_id where g.event_id=target_event_id)
    or exists(select 1 from public.event_members where event_id=target_event_id and user_id<>caller_id)
  then return 'requires_archive'; end if;
  return 'can_delete';
end; $$;

commit;
