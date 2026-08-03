begin;

do $$
declare resolver_definition text;
begin
  select pg_catalog.pg_get_functiondef(
    'public.resolve_attendance_qr(text,uuid)'::regprocedure
  ) into resolver_definition;
  resolver_definition := replace(
    resolver_definition,
    'from public.attendance_records
              where attendance_unit_id = unit_record.id
                and roster_entry_id = roster_record.id',
    'from public.attendance_records as attendance
              where attendance.attendance_unit_id = unit_record.id
                and attendance.roster_entry_id = roster_record.id'
  );
  execute resolver_definition;
end $$;

commit;
