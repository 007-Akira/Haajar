begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

select has_column('public','groups','group_kind','groups have a constrained hierarchy kind');
select has_column('public','groups','parent_group_id','groups support category parents');
select has_table('public','attendance_sessions','attendance sessions exist');
select has_table('public','attendance_units','operational attendance units exist');
select has_table('public','attendance_unit_operators','temporary operators exist');
select has_table('public','attendance_unit_roster','snapshot roster exists');
select has_table('public','attendance_records','attendance records exist');

select ok((select bool_and(relrowsecurity) from pg_class where oid in (
  'public.attendance_sessions'::regclass,'public.attendance_units'::regclass,
  'public.attendance_unit_operators'::regclass,'public.attendance_unit_roster'::regclass,
  'public.attendance_records'::regclass)),'all attendance tables have RLS');
select ok(not exists(select 1 from pg_policies where schemaname='public'
  and tablename like 'attendance_%' and (qual='true' or with_check='true')),
  'attendance has no permissive true policies');
select ok(not has_table_privilege('authenticated','public.attendance_sessions','INSERT')
  and not has_table_privilege('authenticated','public.attendance_units','INSERT')
  and not has_table_privilege('authenticated','public.attendance_unit_roster','INSERT')
  and not has_table_privilege('authenticated','public.attendance_records','INSERT'),
  'mobile cannot insert attendance state directly');

select has_function('public','create_general_attendance_session',array['uuid','text','text','jsonb'],
  'General session RPC exists');
select has_function('public','create_category_attendance_session',array['uuid','text','text'],
  'category session RPC exists');
select has_function('public','set_general_attendance_operator',array['uuid','uuid','boolean','boolean'],
  'temporary volunteer RPC exists');
select has_function('public','mark_attendance_present',array['uuid','text','text','uuid'],
  'QR mark RPC exists');
select has_function('public','mark_attendance_manual',array['uuid','uuid','uuid'],
  'manual mark RPC exists');
select has_function('public','close_roll_call',array['uuid'],'atomic close RPC exists');
select has_function('public','get_roll_call_dashboard',array['uuid'],'dashboard RPC exists');

select ok((select bool_and(prosecdef and proconfig @> array['search_path=']) from pg_proc where oid in (
  'public.create_general_attendance_session(uuid,text,text,jsonb)'::regprocedure,
  'public.create_category_attendance_session(uuid,text,text)'::regprocedure,
  'public.set_general_attendance_operator(uuid,uuid,boolean,boolean)'::regprocedure,
  'public.mark_attendance_present(uuid,text,text,uuid)'::regprocedure,
  'public.mark_attendance_manual(uuid,uuid,uuid)'::regprocedure,
  'public.close_roll_call(uuid)'::regprocedure,
  'public.get_roll_call_dashboard(uuid)'::regprocedure)),
  'attendance RPCs are security definer with fixed empty search path');
select ok(exists(select 1 from pg_publication_tables where pubname='supabase_realtime'
  and schemaname='public' and tablename='attendance_records'),
  'Realtime publishes only attendance record changes');

select * from finish();
rollback;
