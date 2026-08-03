begin;

-- Preserve the hardened dashboard implementation privately and expose a
-- compatibility wrapper. General attendance intentionally has no group, while
-- the shipped mobile dashboard expects a non-null context identifier. Use the
-- event id only for that General navigation/cache context.
alter function public.get_roll_call_dashboard(uuid) set schema private;

revoke all on function private.get_roll_call_dashboard(uuid)
  from public, anon, authenticated;

create function public.get_roll_call_dashboard(target_roll_call_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  dashboard jsonb;
  event_context text;
begin
  dashboard := private.get_roll_call_dashboard(target_roll_call_id);
  if dashboard #>> '{roll_call,scope_type}' = 'general'
    and dashboard #> '{roll_call,group_id}' = 'null'::jsonb then
    event_context := dashboard #>> '{roll_call,event_id}';
    dashboard := jsonb_set(
      dashboard,
      '{roll_call,group_id}',
      to_jsonb(event_context),
      false
    );
  end if;
  return dashboard;
end;
$$;

revoke all on function public.get_roll_call_dashboard(uuid)
  from public, anon, authenticated;
grant execute on function public.get_roll_call_dashboard(uuid) to authenticated;

commit;
