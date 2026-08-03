begin;

-- Preserve the public RPC argument names used by PostgREST while qualifying
-- roster columns that otherwise conflict with PL/pgSQL parameters.
do $$
declare
  resolver_definition text;
  marker_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.resolve_attendance_qr(text,uuid)'::regprocedure
  ) into resolver_definition;
  resolver_definition := replace(
    resolver_definition,
    'from public.attendance_unit_roster
            where attendance_unit_id = unit_record.id
              and user_id = membership_record.user_id for share',
    'from public.attendance_unit_roster as roster
            where roster.attendance_unit_id = unit_record.id
              and roster.user_id = membership_record.user_id for share'
  );
  execute resolver_definition;

  select pg_catalog.pg_get_functiondef(
    'public.mark_attendance_roster_present(uuid,uuid,uuid)'::regprocedure
  ) into marker_definition;
  marker_definition := replace(
    marker_definition,
    'from public.attendance_unit_roster
    where id = roster_entry_id and attendance_unit_id = unit_record.id for share',
    'from public.attendance_unit_roster as roster
    where roster.id = roster_entry_id
      and roster.attendance_unit_id = unit_record.id for share'
  );
  execute marker_definition;
end $$;

commit;
