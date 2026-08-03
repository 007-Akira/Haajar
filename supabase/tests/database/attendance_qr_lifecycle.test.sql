begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','24000000-0000-4000-8000-000000000001','authenticated','authenticated','qr-owner@haajar.local','',now(),'{}','{"full_name":"QR Owner"}',now(),now()),
('00000000-0000-0000-0000-000000000000','24000000-0000-4000-8000-000000000002','authenticated','authenticated','qr-member@haajar.local','',now(),'{}','{"full_name":"QR Member"}',now(),now()),
('00000000-0000-0000-0000-000000000000','24000000-0000-4000-8000-000000000003','authenticated','authenticated','qr-outsider@haajar.local','',now(),'{}','{"full_name":"QR Outsider"}',now(),now());

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('qt.event',public.create_event('QR Attendance Event',null)::text,true);
select set_config('qt.category',public.create_category_group(current_setting('qt.event')::uuid,'Travel',null)::text,true);
select set_config('qt.unit_group',public.create_operational_group(current_setting('qt.category')::uuid,'Bus A',null)::text,true);
select set_config('qt.sibling_group',public.create_operational_group(current_setting('qt.category')::uuid,'Bus B',null)::text,true);
reset role;

insert into public.event_members(event_id,user_id,role,status) values
(current_setting('qt.event')::uuid,'24000000-0000-4000-8000-000000000002','member','active');
insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at) values
(current_setting('qt.unit_group')::uuid,'24000000-0000-4000-8000-000000000002','member','active',
 '24000000-0000-4000-8000-000000000001',now());
select set_config('qt.membership',(select id::text from public.group_memberships
  where group_id=current_setting('qt.unit_group')::uuid
    and user_id='24000000-0000-4000-8000-000000000002'),true);

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
  perform set_config('qt.token',(select qr_token from public.get_membership_qr(
    current_setting('qt.membership')::uuid)),true);
end $$;
select lives_ok($sql$select public.register_push_device(
  'ExpoPushToken[haajar-ci-qr-member]','android','24000000-0000-4000-8000-000000000012')$sql$,
  'member can register a synthetic local push device');
reset role;

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('qt.session',public.create_category_attendance_session(
  current_setting('qt.category')::uuid,'QR check',null)::text,true);
reset role;
select set_config('qt.unit',(select id::text from public.attendance_units
  where session_id=current_setting('qt.session')::uuid
    and group_id=current_setting('qt.unit_group')::uuid),true);
select set_config('qt.sibling_unit',(select id::text from public.attendance_units
  where session_id=current_setting('qt.session')::uuid
    and group_id=current_setting('qt.sibling_group')::uuid),true);
select set_config('qt.roster',(select id::text from public.attendance_unit_roster
  where attendance_unit_id=current_setting('qt.unit')::uuid
    and user_id='24000000-0000-4000-8000-000000000002'),true);

select is((select count(*)::integer from public.notification_deliveries delivery
  join public.notification_jobs job on job.id=delivery.job_id
  where job.entity_id=current_setting('qt.session')::uuid),1,
  'category targeting deduplicates the roster member to one registered device delivery');

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000003',true);
set local role authenticated;
select is((select resolution_status from public.resolve_attendance_qr(
  current_setting('qt.token'),current_setting('qt.unit')::uuid)),'unauthorised',
  'ordinary unrelated member cannot operate the resolver');
select is((select count(*)::integer from public.attendance_unit_roster),0,
  'unrelated user cannot read attendance roster rows through RLS');
select is((select count(*)::integer from public.attendance_records),0,
  'unrelated user cannot read attendance records through RLS');
select throws_ok(format($sql$insert into public.attendance_records(
  attendance_unit_id,session_id,event_id,roster_entry_id,user_id,marked_by,marking_method,client_operation_id)
  values(%L::uuid,%L::uuid,%L::uuid,%L::uuid,'24000000-0000-4000-8000-000000000002',
  '24000000-0000-4000-8000-000000000003','qr',gen_random_uuid())$sql$,
  current_setting('qt.unit'),current_setting('qt.session'),current_setting('qt.event'),current_setting('qt.roster')),
  '42501','direct attendance insert is blocked by grants and RLS');
reset role;

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select resolution_status from public.resolve_attendance_qr(
  current_setting('qt.token'),current_setting('qt.unit')::uuid)),'valid',
  'current QR resolves in its attendance unit');
select is((select resolution_status from public.resolve_attendance_qr(
  current_setting('qt.token'),current_setting('qt.sibling_unit')::uuid)),'wrong_group',
  'QR is rejected by a sibling attendance unit');
select is((select result_status from public.mark_attendance_roster_present(
  current_setting('qt.unit')::uuid,current_setting('qt.roster')::uuid,
  current_setting('qt.token'),gen_random_uuid())),'marked_present','valid QR mark succeeds');
select is((select result_status from public.mark_attendance_roster_present(
  current_setting('qt.unit')::uuid,current_setting('qt.roster')::uuid,
  current_setting('qt.token'),gen_random_uuid())),'already_marked','duplicate QR mark is idempotent');
select is((select count(*)::integer from public.attendance_records
  where attendance_unit_id=current_setting('qt.unit')::uuid
    and roster_entry_id=current_setting('qt.roster')::uuid),1,
  'duplicate marks create one attendance record');
select lives_ok(format('select public.get_offline_roll_call_bundle(%L::uuid)',
  current_setting('qt.unit')),'subgroup scanner can prepare an offline roster bundle');
select is((select result_status from public.sync_offline_attendance(
  current_setting('qt.unit')::uuid,current_setting('qt.membership')::uuid,
  now(),'24000000-0000-4000-8000-000000000021'::uuid)),'already_marked',
  'offline sync reconciles an already-marked member without duplication');
select is((select result_status from public.sync_offline_attendance(
  current_setting('qt.unit')::uuid,current_setting('qt.membership')::uuid,
  now(),'24000000-0000-4000-8000-000000000021'::uuid)),'already_marked',
  'offline sync retry is idempotent');
reset role;

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ begin
  perform set_config('qt.new_token',(select qr_token from public.regenerate_membership_qr(
    current_setting('qt.membership')::uuid)),true);
end $$;
reset role;

select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select resolution_status from public.resolve_attendance_qr(
  current_setting('qt.token'),current_setting('qt.unit')::uuid)),'revoked',
  'regenerated old QR is rejected');
select is((select resolution_status from public.resolve_attendance_qr(
  current_setting('qt.new_token'),current_setting('qt.unit')::uuid)),'valid',
  'regenerated current QR resolves');
select lives_ok(format('select public.close_roll_call(%L::uuid)',current_setting('qt.session')),
  'category attendance closes atomically');
select is((select result_status from public.sync_offline_attendance(
  current_setting('qt.unit')::uuid,current_setting('qt.membership')::uuid,
  now(),'24000000-0000-4000-8000-000000000022'::uuid)),'closed',
  'offline sync reports a closed-session conflict');
select set_config('qt.general',public.create_general_attendance_session(
  current_setting('qt.event')::uuid,'General QR check',null,'[]'::jsonb)::text,true);
select is((select resolution_status from public.resolve_attendance_qr(
  current_setting('qt.new_token'),(select id from public.attendance_units
    where session_id=current_setting('qt.general')::uuid))),'valid',
  'General resolver accepts a current membership QR from the same event');
select is((select count(*)::integer from public.notification_deliveries delivery
  join public.notification_jobs job on job.id=delivery.job_id
  where job.entity_id=current_setting('qt.general')::uuid),1,
  'General notification targets the event roster member once per registered device');
select ok(not exists(select 1 from public.audit_logs
  where old_data::text like '%' || current_setting('qt.token') || '%'
    or new_data::text like '%' || current_setting('qt.token') || '%'
    or metadata::text like '%' || current_setting('qt.token') || '%'),
  'plaintext QR token is absent from audit logs');
select throws_ok(format('select public.get_offline_roll_call_bundle(%L::uuid)',
  (select id from public.attendance_units where session_id=current_setting('qt.general')::uuid)),
  '42501','General attendance has no offline cache contract');
reset role;

select * from finish();
rollback;
