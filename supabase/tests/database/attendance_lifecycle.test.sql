begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'attendance-owner@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Attendance Owner"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'attendance-member@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Attendance Member"}', now(), now()
  ),
  (
    '00000000-0000-0000-8000-000000000003',
    '20000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'attendance-coorg@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Attendance Co-organiser"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '20000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'attendance-outsider@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Attendance Outsider"}', now(), now()
  );

update public.profiles
set phone = '+91000000000' || right(id::text, 1)
where id::text like '20000000-%';

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config(
  'haajar.attendance_event_id',
  public.create_event('Attendance Trip', 'Attendance lifecycle test')::text,
  true
);
select set_config(
  'haajar.attendance_group_id',
  public.create_group(
    current_setting('haajar.attendance_event_id')::uuid,
    'Attendance Group', null
  )::text,
  true
);
select set_config(
  'haajar.wrong_group_id',
  public.create_group(
    current_setting('haajar.attendance_event_id')::uuid,
    'Other Attendance Group', null
  )::text,
  true
);
reset role;

insert into public.event_members (event_id, user_id, role, status)
values
  (current_setting('haajar.attendance_event_id')::uuid,
   '20000000-0000-4000-8000-000000000002', 'member', 'active'),
  (current_setting('haajar.attendance_event_id')::uuid,
   '20000000-0000-4000-8000-000000000003', 'member', 'active'),
  (current_setting('haajar.attendance_event_id')::uuid,
   '20000000-0000-4000-8000-000000000004', 'member', 'active');

insert into public.group_memberships (
  group_id, user_id, role, status, approved_by, approved_at
)
values
  (current_setting('haajar.attendance_group_id')::uuid,
   '20000000-0000-4000-8000-000000000002', 'member', 'active',
   '20000000-0000-4000-8000-000000000001', now()),
  (current_setting('haajar.attendance_group_id')::uuid,
   '20000000-0000-4000-8000-000000000003', 'co_organiser', 'active',
   '20000000-0000-4000-8000-000000000001', now()),
  (current_setting('haajar.wrong_group_id')::uuid,
   '20000000-0000-4000-8000-000000000004', 'member', 'active',
   '20000000-0000-4000-8000-000000000001', now());

select set_config(
  'haajar.attendance_member_membership_id',
  (select id::text from public.group_memberships
   where group_id = current_setting('haajar.attendance_group_id')::uuid
     and user_id = '20000000-0000-4000-8000-000000000002'),
  true
);
select set_config(
  'haajar.attendance_coorg_membership_id',
  (select id::text from public.group_memberships
   where group_id = current_setting('haajar.attendance_group_id')::uuid
     and user_id = '20000000-0000-4000-8000-000000000003'),
  true
);
select set_config(
  'haajar.wrong_membership_id',
  (select id::text from public.group_memberships
   where group_id = current_setting('haajar.wrong_group_id')::uuid
     and user_id = '20000000-0000-4000-8000-000000000004'),
  true
);
select set_config(
  'haajar.attendance_coorg_token',
  (select qr_token from public.issue_membership_qr(
    current_setting('haajar.attendance_coorg_membership_id')::uuid
  )),
  true
);
select set_config(
  'haajar.wrong_group_token',
  (select qr_token from public.issue_membership_qr(
    current_setting('haajar.wrong_membership_id')::uuid
  )),
  true
);

update public.groups set status = 'archived'
where id = current_setting('haajar.attendance_group_id')::uuid;
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select throws_ok(
  $$select public.create_roll_call(
    current_setting('haajar.attendance_group_id')::uuid,
    'Archived attempt', null
  )$$,
  '55000',
  'archived groups cannot create active roll calls'
);
reset role;
update public.groups set status = 'active'
where id = current_setting('haajar.attendance_group_id')::uuid;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select throws_ok(
  $$select public.create_roll_call(
    current_setting('haajar.attendance_group_id')::uuid,
    'Member attempt', null
  )$$,
  '42501',
  'a normal member cannot create a roll call'
);
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config(
  'haajar.roll_call_id',
  public.create_roll_call(
    current_setting('haajar.attendance_group_id')::uuid,
    'Before departure', 'Online attendance test'
  )::text,
  true
);
select ok(
  current_setting('haajar.roll_call_id')::uuid is not null,
  'an authorised organiser creates and activates a roll call'
);
select throws_ok(
  $$select public.create_roll_call(
    current_setting('haajar.attendance_group_id')::uuid,
    'Duplicate active roll call', null
  )$$,
  '23505',
  'a second active roll call is rejected'
);
reset role;

select is(
  (select count(*)::integer from public.roll_call_roster_members
   where roll_call_id = current_setting('haajar.roll_call_id')::uuid),
  3,
  'roll-call creation freezes the three active group memberships'
);

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(
  (select total_roster from public.get_active_roll_call(
    current_setting('haajar.attendance_group_id')::uuid
  )),
  null::bigint,
  'ordinary members receive only the safe active-roll-call summary'
);
select throws_ok(
  $$select * from public.mark_attendance_manual(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_member_membership_id')::uuid,
    '21000000-0000-4000-8000-000000000001'::uuid
  )$$,
  '42501',
  'a normal member cannot mark attendance manually'
);
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$select * from public.mark_attendance_manual(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_member_membership_id')::uuid,
    '21000000-0000-4000-8000-000000000002'::uuid
  )$$,
  '42501',
  'a co-organiser cannot use manual attendance under current policy'
);
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select result_status from public.mark_attendance_manual(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_member_membership_id')::uuid,
    '21000000-0000-4000-8000-000000000003'::uuid
  )),
  'marked_present',
  'an organiser can manually mark an active roster member present'
);
select is(
  (select result_status from public.mark_attendance_manual(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_member_membership_id')::uuid,
    '21000000-0000-4000-8000-000000000004'::uuid
  )),
  'already_marked',
  'a duplicate mark returns already_marked instead of inserting another row'
);
select is(
  (select count(*)::integer from public.attendance_records
   where roll_call_id = current_setting('haajar.roll_call_id')::uuid
     and membership_id = current_setting('haajar.attendance_member_membership_id')::uuid),
  1,
  'duplicate and concurrent protection leaves one attendance record'
);
select is(
  (select result_status from public.mark_attendance_present(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.wrong_group_token'),
    'qr',
    '21000000-0000-4000-8000-000000000005'::uuid
  )),
  'wrong_group',
  'a credential from another group is rejected'
);
reset role;

update public.group_memberships set status = 'inactive'
where id = current_setting('haajar.attendance_coorg_membership_id')::uuid;
select is(
  (select count(*)::integer from public.roll_call_roster_members
   where roll_call_id = current_setting('haajar.roll_call_id')::uuid),
  3,
  'later membership status changes do not rewrite the frozen historical roster'
);
select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select result_status from public.mark_attendance_present(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_coorg_token'),
    'qr',
    '21000000-0000-4000-8000-000000000006'::uuid
  )),
  'inactive_membership',
  'an inactive membership cannot be marked present'
);
reset role;
update public.group_memberships set status = 'active'
where id = current_setting('haajar.attendance_coorg_membership_id')::uuid;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select result_status from public.mark_attendance_present(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_coorg_token'),
    'qr',
    '21000000-0000-4000-8000-000000000007'::uuid
  )),
  'marked_present',
  'a valid active group credential marks its member present'
);
select is(
  (public.get_roll_call_dashboard(current_setting('haajar.roll_call_id')::uuid)
    #>> '{counts,present}')::integer,
  2,
  'dashboard present count is correct'
);
select is(
  (public.get_roll_call_dashboard(current_setting('haajar.roll_call_id')::uuid)
    #>> '{counts,remaining}')::integer,
  1,
  'dashboard remaining count is correct'
);
select is(
  (select present_count from public.close_roll_call(
    current_setting('haajar.roll_call_id')::uuid
  )),
  2::bigint,
  'closing returns the final present count'
);
select is(
  (select remaining_count from public.close_roll_call(
    current_setting('haajar.roll_call_id')::uuid
  )),
  1::bigint,
  'repeated closure is idempotent and preserves the final remaining count'
);
select is(
  (select result_status from public.mark_attendance_present(
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_coorg_token'),
    'qr',
    '21000000-0000-4000-8000-000000000008'::uuid
  )),
  'closed',
  'a closed roll call rejects further marking'
);
reset role;

select set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select throws_ok(
  $$select public.get_roll_call_dashboard(
    current_setting('haajar.roll_call_id')::uuid
  )$$,
  '42501',
  'an unrelated group member cannot read dashboard member data'
);
select is(
  (select count(*)::integer from public.attendance_records
   where roll_call_id = current_setting('haajar.roll_call_id')::uuid),
  0,
  'RLS hides unrelated attendance records'
);
select throws_ok(
  $$insert into public.attendance_records (
    roll_call_id, event_id, group_id, membership_id, user_id,
    marked_by, marking_method, client_operation_id
  ) values (
    current_setting('haajar.roll_call_id')::uuid,
    current_setting('haajar.attendance_event_id')::uuid,
    current_setting('haajar.attendance_group_id')::uuid,
    current_setting('haajar.attendance_member_membership_id')::uuid,
    '20000000-0000-4000-8000-000000000002',
    '20000000-0000-4000-8000-000000000004',
    'manual', gen_random_uuid()
  )$$,
  '42501',
  'direct attendance inserts are blocked'
);
reset role;

select ok(
  not exists (
    select 1 from public.audit_logs
    where old_data::text like '%' || current_setting('haajar.attendance_coorg_token') || '%'
       or new_data::text like '%' || current_setting('haajar.attendance_coorg_token') || '%'
       or metadata::text like '%' || current_setting('haajar.attendance_coorg_token') || '%'
  ),
  'attendance audit logs contain no plaintext QR token'
);

select * from finish();
rollback;
