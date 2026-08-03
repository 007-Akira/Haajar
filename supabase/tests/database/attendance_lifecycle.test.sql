begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000001','authenticated','authenticated','owner@attendance.local','',now(),'{}','{"full_name":"Owner"}',now(),now()),
('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000002','authenticated','authenticated','bus1@attendance.local','',now(),'{}','{"full_name":"Bus One"}',now(),now()),
('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000003','authenticated','authenticated','bus2@attendance.local','',now(),'{}','{"full_name":"Bus Two"}',now(),now()),
('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000004','authenticated','authenticated','volunteer@attendance.local','',now(),'{}','{"full_name":"Volunteer"}',now(),now()),
('00000000-0000-0000-0000-000000000000','22000000-0000-4000-8000-000000000005','authenticated','authenticated','outsider@attendance.local','',now(),'{}','{"full_name":"Outsider"}',now(),now());

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('h.event',public.create_event('Hierarchy Trip',null)::text,true);
select set_config('h.category',public.create_category_group(current_setting('h.event')::uuid,'Bus',null)::text,true);
select set_config('h.bus1',public.create_operational_group(current_setting('h.category')::uuid,'Bus 1',null)::text,true);
select set_config('h.bus2',public.create_operational_group(current_setting('h.category')::uuid,'Bus 2',null)::text,true);
reset role;

insert into public.event_members(event_id,user_id,role,status) values
(current_setting('h.event')::uuid,'22000000-0000-4000-8000-000000000002','member','active'),
(current_setting('h.event')::uuid,'22000000-0000-4000-8000-000000000003','member','active'),
(current_setting('h.event')::uuid,'22000000-0000-4000-8000-000000000004','member','active'),
(current_setting('h.event')::uuid,'22000000-0000-4000-8000-000000000005','member','active');
insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at) values
(current_setting('h.bus1')::uuid,'22000000-0000-4000-8000-000000000002','organiser','active','22000000-0000-4000-8000-000000000001',now()),
(current_setting('h.bus2')::uuid,'22000000-0000-4000-8000-000000000003','organiser','active','22000000-0000-4000-8000-000000000001',now());
select throws_ok(format($sql$insert into public.group_memberships(group_id,user_id,role,status,approved_by,approved_at)
  values(%L::uuid,'22000000-0000-4000-8000-000000000002','organiser','active',
  '22000000-0000-4000-8000-000000000001',now())$sql$,current_setting('h.bus2')),
  '23505','Member already belongs to an operational subgroup in this category',
  'elevated role assignment cannot bypass sibling membership exclusivity');

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('h.category_session',public.create_category_attendance_session(
  current_setting('h.category')::uuid,'Boarding',null)::text,true);
reset role;
select is((select count(*)::integer from public.attendance_units
  where session_id=current_setting('h.category_session')::uuid),2,'category creates one unit per child subgroup');
select is((select count(*)::integer from public.attendance_unit_roster
  where session_id=current_setting('h.category_session')::uuid),2,'category aggregate roster contains unique child members');
select is((select count(distinct user_id)::integer from public.attendance_unit_roster
  where session_id=current_setting('h.category_session')::uuid),2,'category roster does not double-count users');
select is((select count(*)::integer from public.attendance_unit_roster
  where attendance_unit_id=(select id from public.attendance_units
    where session_id=current_setting('h.category_session')::uuid
      and group_id=current_setting('h.bus1')::uuid)),1,'first child unit captures only its subgroup roster');
select is((select count(*)::integer from public.attendance_unit_roster
  where attendance_unit_id=(select id from public.attendance_units
    where session_id=current_setting('h.category_session')::uuid
      and group_id=current_setting('h.bus2')::uuid)),1,'second child unit captures only its subgroup roster');
select set_config('h.bus1_unit',(select id::text from public.attendance_units
  where session_id=current_setting('h.category_session')::uuid and group_id=current_setting('h.bus1')::uuid),true);
select set_config('h.bus2_unit',(select id::text from public.attendance_units
  where session_id=current_setting('h.category_session')::uuid and group_id=current_setting('h.bus2')::uuid),true);

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select lives_ok(format('select public.get_roll_call_dashboard(%L::uuid)',current_setting('h.bus1_unit')),
  'subgroup organiser views own unit');
select throws_ok(format('select public.get_roll_call_dashboard(%L::uuid)',current_setting('h.bus2_unit')),
  '42501','subgroup organiser cannot view sibling unit');
select throws_ok(format('select public.get_roll_call_dashboard(%L::uuid)',current_setting('h.category_session')),
  '42501','subgroup organiser cannot view category aggregate');
reset role;

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((public.get_roll_call_dashboard(current_setting('h.category_session')::uuid)#>>'{counts,total_roster}')::integer,
  2,'super organiser sees aggregate snapshot total');
select is(jsonb_array_length(public.get_roll_call_dashboard(current_setting('h.category_session')::uuid)->'units'),
  2,'category dashboard includes per-subgroup progress');
select set_config('h.bus1_membership',(select id::text from public.group_memberships
  where group_id=current_setting('h.bus1')::uuid
    and user_id='22000000-0000-4000-8000-000000000002'),true);
select lives_ok(format('select * from public.transfer_operational_group_membership(%L::uuid,%L::uuid)',
  current_setting('h.bus1_membership'),current_setting('h.bus2')),
  'event super organiser atomically transfers a member to a sibling subgroup');
select is((select count(*)::integer from public.group_memberships gm
  where gm.category_group_id=current_setting('h.category')::uuid
    and gm.user_id='22000000-0000-4000-8000-000000000002' and gm.status='active'),1,
  'transfer leaves exactly one active operational membership in the category');
select is((select group_id from public.group_memberships
  where category_group_id=current_setting('h.category')::uuid
    and user_id='22000000-0000-4000-8000-000000000002' and status='active'),
  current_setting('h.bus2')::uuid,'transfer activates the requested sibling subgroup');
select is((select group_id from public.attendance_unit_roster
  where session_id=current_setting('h.category_session')::uuid
    and user_id='22000000-0000-4000-8000-000000000002'),
  current_setting('h.bus1')::uuid,'existing attendance snapshot retains the original subgroup');
select ok(not exists(select 1 from public.audit_logs
  where action='group_membership.transferred'
    and (old_data::text ilike '%qr_token%' or new_data::text ilike '%qr_token%'
      or metadata::text ilike '%qr_token%')),
  'transfer audit does not contain a plain QR token');
select set_config('h.general',public.create_general_attendance_session(current_setting('h.event')::uuid,
  'General check',null,jsonb_build_array(jsonb_build_object('user_id','22000000-0000-4000-8000-000000000004',
  'can_scan',true,'can_mark_manually',true)))::text,true);
reset role;
select is((select count(*)::integer from public.attendance_units where session_id=current_setting('h.general')::uuid),
  1,'General creates exactly one event unit');
select is((select count(*)::integer from public.attendance_units where session_id=current_setting('h.general')::uuid
  and group_id is not null),0,'General creates no subgroup units');
select is((select count(*)::integer from public.attendance_unit_roster
  where session_id=current_setting('h.general')::uuid),5,
  'General snapshots the complete active event roster');
select ok((select can_scan and can_mark_manually from public.attendance_unit_operators
  where attendance_unit_id=(select id from public.attendance_units
    where session_id=current_setting('h.general')::uuid)
    and user_id='22000000-0000-4000-8000-000000000004'),
  'selected General volunteer receives the requested scan and manual permissions');

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000005',true);
set local role authenticated;
select throws_ok(format('select public.mark_attendance_manual(%L::uuid,%L::uuid,gen_random_uuid())',
  (select id from public.attendance_units where session_id=current_setting('h.general')::uuid),
  (select event_member_id from public.attendance_unit_roster where session_id=current_setting('h.general')::uuid limit 1)),
  '42501','unselected event member cannot operate General');
reset role;

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000004',true);
set local role authenticated;
select is((select result_status from public.mark_attendance_manual(
  (select id from public.attendance_units where session_id=current_setting('h.general')::uuid),
  (select event_member_id from public.attendance_unit_roster where session_id=current_setting('h.general')::uuid
    and user_id='22000000-0000-4000-8000-000000000003'),gen_random_uuid())),
  'marked_present','selected General volunteer can mark manually');
reset role;

select set_config('request.jwt.claim.sub','22000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select is((select remaining_count from public.close_roll_call(current_setting('h.category_session')::uuid)),
  2::bigint,'closing category freezes final absent count');
reset role;
update public.group_memberships set status='inactive' where group_id=current_setting('h.bus1')::uuid;
select is((select count(*)::integer from public.attendance_unit_roster
  where session_id=current_setting('h.category_session')::uuid),2,'later membership changes do not alter history');

select * from finish();
rollback;
