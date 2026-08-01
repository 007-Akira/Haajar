begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'authenticated',
    'authenticated',
    'account-a@haajar.local',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Account A"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    'authenticated',
    'authenticated',
    'account-b@haajar.local',
    '',
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Account B"}',
    now(),
    now()
  );

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
set local role authenticated;
select lives_ok(
  $$select public.create_event('Account A Trip', 'Local integration test')$$,
  'Account A can create an event through create_event'
);
reset role;

select set_config(
  'haajar.test_event_id',
  (select id::text from public.events where name = 'Account A Trip'),
  true
);

select is(
  (select role from public.event_members where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'super_organiser',
  'create_event assigns Account A the super organiser role'
);
select is(
  (select status from public.event_members where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'active',
  'create_event activates the creator membership'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
set local role authenticated;
select is(
  (select count(*)::integer from public.events where name = 'Account A Trip'),
  0,
  'Account B cannot query an unrelated event'
);
select is(
  (select count(*)::integer from public.event_members),
  0,
  'Account B cannot read unrelated event members'
);
reset role;

select set_config('request.jwt.claim.sub', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', true);
set local role authenticated;
select lives_ok(
  $$select public.create_group(
    current_setting('haajar.test_event_id')::uuid,
    'Account A Group',
    'Local integration test'
  )$$,
  'Account A can create a group under its event'
);
reset role;

select set_config(
  'haajar.test_group_id',
  (select id::text from public.groups where name = 'Account A Group'),
  true
);

select is(
  (select role from public.group_memberships where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  'organiser',
  'create_group assigns Account A the organiser role'
);
select is(
  (
    select e.name
    from public.groups g
    join public.events e on e.id = g.event_id
    where g.name = 'Account A Group'
  ),
  'Account A Trip',
  'create_group places the group under the requested event'
);

select set_config('request.jwt.claim.sub', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', true);
set local role authenticated;
select throws_ok(
  $$select public.create_group(
    current_setting('haajar.test_event_id')::uuid,
    'Forbidden Group',
    null
  )$$,
  '42501'
);
select throws_ok(
  $$insert into public.group_memberships (group_id, user_id, role, status)
    values (
      current_setting('haajar.test_group_id')::uuid,
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'super_organiser',
      'active'
    )$$,
  '42501'
);
select is(
  (select count(*)::integer from public.groups where name = 'Account A Group'),
  0,
  'Account B cannot read the unrelated group'
);
select is(
  (select count(*)::integer from public.group_memberships),
  0,
  'Account B cannot read unrelated group members'
);
reset role;

select * from finish();
rollback;
