begin;

-- Attendance rows contain no QR token material. Publishing only this table lets
-- focused dashboards observe scoped attendance changes without subscribing to
-- credentials, profiles, memberships, or unrelated groups.
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendance_records'
  ) then
    alter publication supabase_realtime add table public.attendance_records;
  end if;
end;
$$;

commit;
