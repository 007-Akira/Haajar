begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'roll_calls', 'roll_calls exists');
select has_table(
  'public', 'roll_call_roster_members',
  'roll_call_roster_members preserves the starting roster'
);
select has_table('public', 'attendance_records', 'attendance_records exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.roll_calls'::regclass),
  'roll_calls has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class
   where oid = 'public.roll_call_roster_members'::regclass),
  'roll_call_roster_members has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.attendance_records'::regclass),
  'attendance_records has RLS enabled'
);

select has_index(
  'public', 'roll_calls', 'roll_calls_one_active_per_group_idx',
  'only one active roll call is allowed per group'
);
select has_index(
  'public', 'attendance_records', 'attendance_one_record_per_member',
  'a roster member can be marked only once per roll call'
);
select has_index(
  'public', 'attendance_records', 'attendance_client_operation_unique',
  'client attendance operations are idempotent'
);

select ok(
  not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename in ('roll_calls', 'roll_call_roster_members', 'attendance_records')
      and (qual = 'true' or with_check = 'true')
  ),
  'attendance tables have no permissive true policies'
);

select ok(
  exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'attendance_records'
  ),
  'Realtime publishes attendance record changes used by scoped dashboards'
);

select ok(
  not has_table_privilege('authenticated', 'public.roll_calls', 'INSERT')
  and not has_table_privilege('authenticated', 'public.roll_calls', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.roll_calls', 'DELETE'),
  'clients cannot mutate roll calls directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.roll_call_roster_members', 'INSERT')
  and not has_table_privilege('authenticated', 'public.roll_call_roster_members', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.roll_call_roster_members', 'DELETE'),
  'clients cannot mutate frozen rosters directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.attendance_records', 'INSERT')
  and not has_table_privilege('authenticated', 'public.attendance_records', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.attendance_records', 'DELETE'),
  'clients cannot mutate attendance directly'
);

select has_function(
  'public', 'create_roll_call', array['uuid', 'text', 'text'],
  'secured roll-call creation RPC exists'
);
select has_function(
  'public', 'get_active_roll_call', array['uuid'],
  'active roll-call summary RPC exists'
);
select has_function(
  'public', 'mark_attendance_present', array['uuid', 'text', 'text', 'uuid'],
  'QR attendance RPC exists'
);
select has_function(
  'public', 'mark_attendance_manual', array['uuid', 'uuid', 'uuid'],
  'manual attendance RPC exists'
);
select has_function(
  'public', 'close_roll_call', array['uuid'],
  'roll-call closure RPC exists'
);
select has_function(
  'public', 'get_roll_call_dashboard', array['uuid'],
  'roll-call dashboard RPC exists'
);
select has_function(
  'public', 'get_roll_call_history', array['uuid'],
  'secured roll-call history RPC exists'
);

select ok(
  (select bool_and(prosecdef) from pg_proc
   where oid in (
     'public.create_roll_call(uuid, text, text)'::regprocedure,
     'public.get_active_roll_call(uuid)'::regprocedure,
     'public.mark_attendance_present(uuid, text, text, uuid)'::regprocedure,
     'public.mark_attendance_manual(uuid, uuid, uuid)'::regprocedure,
     'public.close_roll_call(uuid)'::regprocedure,
     'public.get_roll_call_dashboard(uuid)'::regprocedure,
     'public.get_roll_call_history(uuid)'::regprocedure
   )),
  'public attendance RPCs are security definer functions'
);
select ok(
  (select bool_and(proconfig @> array['search_path=']) from pg_proc
   where oid in (
     'public.create_roll_call(uuid, text, text)'::regprocedure,
     'public.get_active_roll_call(uuid)'::regprocedure,
     'public.mark_attendance_present(uuid, text, text, uuid)'::regprocedure,
     'public.mark_attendance_manual(uuid, uuid, uuid)'::regprocedure,
     'public.close_roll_call(uuid)'::regprocedure,
     'public.get_roll_call_dashboard(uuid)'::regprocedure,
     'public.get_roll_call_history(uuid)'::regprocedure
   )),
  'public attendance RPCs use an empty fixed search path'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.create_roll_call(uuid, text, text)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.create_roll_call(uuid, text, text)', 'EXECUTE'
  ),
  'only authenticated clients may execute roll-call creation'
);

select * from finish();
rollback;
