create extension if not exists pgtap with schema extensions;
create extension if not exists dblink with schema extensions;
select plan(4);

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','25000000-0000-4000-8000-000000000001','authenticated','authenticated','concurrency-owner@haajar.local','',now(),'{}','{"full_name":"Concurrency Owner"}',now(),now()),
('00000000-0000-0000-0000-000000000000','25000000-0000-4000-8000-000000000002','authenticated','authenticated','concurrency-member@haajar.local','',now(),'{}','{"full_name":"Concurrency Member"}',now(),now());

select set_config('request.jwt.claim.sub','25000000-0000-4000-8000-000000000001',false);
set role authenticated;
select set_config('ct.event',public.create_event('Concurrency Event',null)::text,false);
select set_config('ct.category',public.create_category_group(current_setting('ct.event')::uuid,'Concurrency Category',null)::text,false);
select set_config('ct.unit1_group',public.create_operational_group(current_setting('ct.category')::uuid,'Unit One',null)::text,false);
select set_config('ct.unit2_group',public.create_operational_group(current_setting('ct.category')::uuid,'Unit Two',null)::text,false);
reset role;
insert into public.event_members(event_id,user_id,role,status) values
(current_setting('ct.event')::uuid,'25000000-0000-4000-8000-000000000002','member','active');

select extensions.dblink_connect_u('membership_one','host=127.0.0.1 dbname=postgres user=postgres');
select extensions.dblink_connect_u('membership_two','host=127.0.0.1 dbname=postgres user=postgres');
select extensions.dblink_send_query('membership_one',format($sql$
  insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
  values(%L::uuid,'25000000-0000-4000-8000-000000000002','member','active',
    '25000000-0000-4000-8000-000000000001',now()) returning group_id::text$sql$,
  current_setting('ct.unit1_group')));
select extensions.dblink_send_query('membership_two',format($sql$
  insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
  values(%L::uuid,'25000000-0000-4000-8000-000000000002','member','active',
    '25000000-0000-4000-8000-000000000001',now()) returning group_id::text$sql$,
  current_setting('ct.unit2_group')));
select * from extensions.dblink_get_result('membership_one',false) as result(group_id text);
select * from extensions.dblink_get_result('membership_two',false) as result(group_id text);
select extensions.dblink_disconnect('membership_one');
select extensions.dblink_disconnect('membership_two');

select is((select count(*)::integer from public.group_memberships
  where category_group_id=current_setting('ct.category')::uuid
    and user_id='25000000-0000-4000-8000-000000000002' and status='active'),1,
  'concurrent sibling assignments yield one active operational membership');
select is((select count(distinct category_group_id)::integer from public.group_memberships
  where user_id='25000000-0000-4000-8000-000000000002' and status='active'),1,
  'the winning membership retains the database-derived category scope');

select set_config('request.jwt.claim.sub','25000000-0000-4000-8000-000000000001',false);
set role authenticated;
select set_config('ct.session',public.create_category_attendance_session(
  current_setting('ct.category')::uuid,'Concurrent scan',null)::text,false);
reset role;
select set_config('ct.unit',(select id::text from public.attendance_units
  where session_id=current_setting('ct.session')::uuid
    and group_id=(select group_id from public.group_memberships
      where user_id='25000000-0000-4000-8000-000000000002' and status='active')),false);
select set_config('ct.roster',(select id::text from public.attendance_unit_roster
  where attendance_unit_id=current_setting('ct.unit')::uuid
    and user_id='25000000-0000-4000-8000-000000000002'),false);

create temporary table concurrency_scan_results(result_status text);
select extensions.dblink_connect_u('scan_one','host=127.0.0.1 dbname=postgres user=postgres');
select extensions.dblink_connect_u('scan_two','host=127.0.0.1 dbname=postgres user=postgres');
select extensions.dblink_send_query('scan_one',format($sql$
  select result_status from private.record_unit_attendance(%L::uuid,%L::uuid,'qr',
    '25000000-0000-4000-8000-000000000011'::uuid,'25000000-0000-4000-8000-000000000001'::uuid)$sql$,
  current_setting('ct.unit'),current_setting('ct.roster')));
select extensions.dblink_send_query('scan_two',format($sql$
  select result_status from private.record_unit_attendance(%L::uuid,%L::uuid,'qr',
    '25000000-0000-4000-8000-000000000012'::uuid,'25000000-0000-4000-8000-000000000001'::uuid)$sql$,
  current_setting('ct.unit'),current_setting('ct.roster')));
insert into concurrency_scan_results select * from extensions.dblink_get_result('scan_one',false)
  as result(result_status text);
insert into concurrency_scan_results select * from extensions.dblink_get_result('scan_two',false)
  as result(result_status text);
select extensions.dblink_disconnect('scan_one');
select extensions.dblink_disconnect('scan_two');

select is((select count(*)::integer from public.attendance_records
  where attendance_unit_id=current_setting('ct.unit')::uuid
    and roster_entry_id=current_setting('ct.roster')::uuid),1,
  'concurrent scans create exactly one attendance record');
select set_eq('select result_status from concurrency_scan_results',
  array['marked_present','already_marked'],
  'concurrent scans reconcile to marked and already-marked outcomes');

select * from finish();
