begin;

create extension if not exists pgtap with schema extensions;
select plan(31);

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated', 'form-owner@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Form Owner"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000002',
    'authenticated', 'authenticated', 'accepted@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Accepted Member"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000003',
    'authenticated', 'authenticated', 'outsider@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Outsider"}', now(), now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '10000000-0000-4000-8000-000000000004',
    'authenticated', 'authenticated', 'rejected@haajar.local', '', now(),
    '{"provider":"email","providers":["email"]}', '{"full_name":"Rejected Member"}', now(), now()
  );

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select set_config(
  'haajar.lifecycle_event_id',
  public.create_event('Registration Lifecycle Trip', 'RPC integration test')::text,
  true
);
select set_config(
  'haajar.lifecycle_group_id',
  public.create_group(
    current_setting('haajar.lifecycle_event_id')::uuid,
    'Registration Lifecycle Group',
    null
  )::text,
  true
);
select set_config(
  'haajar.lifecycle_form_id',
  public.create_registration_form(
    current_setting('haajar.lifecycle_group_id')::uuid
  )::text,
  true
);
select public.save_registration_form_draft(
  current_setting('haajar.lifecycle_form_id')::uuid,
  jsonb_build_array(
    jsonb_build_object(
      'label', 'Register number',
      'question_type', 'short_text',
      'is_required', true,
      'position', 0,
      'options', jsonb_build_array()
    ),
    jsonb_build_object(
      'label', 'Batch',
      'question_type', 'dropdown',
      'is_required', true,
      'position', 1,
      'options', jsonb_build_array(
        jsonb_build_object('label', '2027', 'value', '2027', 'position', 0),
        jsonb_build_object('label', '2028', 'value', '2028', 'position', 1)
      )
    )
  )
);
select set_config(
  'haajar.register_question_id',
  (select id::text from public.registration_questions
   where form_id = current_setting('haajar.lifecycle_form_id')::uuid and position = 0),
  true
);
select set_config(
  'haajar.batch_question_id',
  (select id::text from public.registration_questions
   where form_id = current_setting('haajar.lifecycle_form_id')::uuid and position = 1),
  true
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$select public.publish_registration_form(
    current_setting('haajar.lifecycle_form_id')::uuid
  )$$,
  '42501',
  'an unrelated user cannot publish a registration form'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$select public.publish_registration_form(
    current_setting('haajar.lifecycle_form_id')::uuid
  )$$,
  'the group manager can publish a valid registration form'
);
select is(
  (select status from public.registration_forms
   where id = current_setting('haajar.lifecycle_form_id')::uuid),
  'published',
  'publishing changes the form status'
);
select set_config(
  'haajar.invitation_token',
  (select invitation_token from public.create_group_invitation(
    current_setting('haajar.lifecycle_group_id')::uuid
  )),
  true
);
select is(
  length(current_setting('haajar.invitation_token')),
  24,
  'a manager can create a 96-bit join token'
);
select isnt(
  (select token_hash from public.group_invitations
   where group_id = current_setting('haajar.lifecycle_group_id')::uuid and status = 'active'),
  current_setting('haajar.invitation_token'),
  'the invitation token is stored only as a hash'
);
select throws_ok(
  $$select public.save_registration_form_draft(
    current_setting('haajar.lifecycle_form_id')::uuid,
    '[]'::jsonb
  )$$,
  '55000',
  'published form structure cannot be edited'
);
select throws_ok(
  $$select public.submit_join_request(
    current_setting('haajar.lifecycle_group_id')::uuid,
    '[]'::jsonb
  )$$,
  '23505',
  'an active member cannot submit another join request'
);
reset role;

select set_config('request.jwt.claim.sub', '', true);
set local role anon;
select is(
  public.resolve_group_invitation(current_setting('haajar.invitation_token')) ->> 'group_name',
  'Registration Lifecycle Group',
  'an anonymous holder can safely preview the invited group'
);
select throws_ok(
  $$select public.resolve_group_invitation('000000000000000000000000')$$,
  'P0002',
  'an invalid invitation cannot expose group data'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select lives_ok(
  format(
    'select public.submit_join_request(%L::uuid, %L::jsonb)',
    current_setting('haajar.lifecycle_group_id'),
    jsonb_build_array(
      jsonb_build_object(
        'question_id',
        current_setting('haajar.register_question_id')::uuid,
        'answer', 'PTA23CS067'
      ),
      jsonb_build_object(
        'question_id',
        current_setting('haajar.batch_question_id')::uuid,
        'answer', '2027'
      )
    )::text
  ),
  'an authenticated user can submit a valid join request'
);
select throws_ok(
  format(
    'select public.submit_join_request(%L::uuid, %L::jsonb)',
    current_setting('haajar.lifecycle_group_id'),
    jsonb_build_array(
      jsonb_build_object(
        'question_id',
        current_setting('haajar.register_question_id')::uuid,
        'answer', 'PTA23CS067'
      ),
      jsonb_build_object(
        'question_id',
        current_setting('haajar.batch_question_id')::uuid,
        'answer', '2027'
      )
    )::text
  ),
  '23505',
  'a duplicate pending request is rejected'
);
reset role;

select set_config(
  'haajar.accept_request_id',
  (select id::text from public.join_requests
   where group_id = current_setting('haajar.lifecycle_group_id')::uuid
     and user_id = '10000000-0000-4000-8000-000000000002'),
  true
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$select public.list_group_join_requests(
    current_setting('haajar.lifecycle_group_id')::uuid, 'pending'
  )$$,
  '42501',
  'an unrelated user cannot list group join requests'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  jsonb_array_length(public.list_group_join_requests(
    current_setting('haajar.lifecycle_group_id')::uuid, 'pending'
  )),
  1,
  'a manager can list pending applicants with their submitted answers'
);
reset role;

insert into public.join_requests (id, group_id, user_id)
values (
  '10000000-0000-4000-8000-000000000099',
  current_setting('haajar.lifecycle_group_id')::uuid,
  '10000000-0000-4000-8000-000000000001'
);

select set_config(
  'haajar.self_request_id',
  '10000000-0000-4000-8000-000000000099',
  true
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select throws_ok(
  $$select * from public.review_join_request(
    current_setting('haajar.self_request_id')::uuid, 'accept', null
  )$$,
  '42501',
  'a manager cannot approve their own request'
);
select set_config(
  'haajar.accepted_qr_token',
  (select qr_token from public.review_join_request(
    current_setting('haajar.accept_request_id')::uuid, 'accept', null
  )),
  true
);
select ok(
  length(current_setting('haajar.accepted_qr_token')) = 64,
  'acceptance returns a cryptographically random token once'
);
reset role;

select is(
  (select status from public.event_members
   where event_id = current_setting('haajar.lifecycle_event_id')::uuid
     and user_id = '10000000-0000-4000-8000-000000000002'),
  'active',
  'acceptance creates or activates event membership'
);
select is(
  (select status from public.group_memberships
   where group_id = current_setting('haajar.lifecycle_group_id')::uuid
     and user_id = '10000000-0000-4000-8000-000000000002'),
  'active',
  'acceptance creates or activates group membership'
);
select is(
  (select count(*)::integer from public.qr_credentials as credential
   join public.group_memberships as membership
     on membership.id = credential.group_membership_id
   where membership.group_id = current_setting('haajar.lifecycle_group_id')::uuid
     and membership.user_id = '10000000-0000-4000-8000-000000000002'
     and credential.status = 'active'),
  1,
  'acceptance issues exactly one active QR credential'
);
select isnt(
  (select token_hash from public.qr_credentials as credential
   join public.group_memberships as membership
     on membership.id = credential.group_membership_id
   where membership.group_id = current_setting('haajar.lifecycle_group_id')::uuid
     and membership.user_id = '10000000-0000-4000-8000-000000000002'
     and credential.status = 'active'),
  current_setting('haajar.accepted_qr_token'),
  'the plaintext QR token is never stored'
);

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000002', true);
set local role authenticated;
select is(
  (select qr_token from public.get_membership_qr(
    (select id from public.group_memberships
     where group_id = current_setting('haajar.lifecycle_group_id')::uuid
       and user_id = '10000000-0000-4000-8000-000000000002')
  )),
  current_setting('haajar.accepted_qr_token'),
  'a member can retrieve their active encrypted QR credential'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000003', true);
set local role authenticated;
select throws_ok(
  $$select public.get_membership_qr(
    (select id from public.group_memberships
     where group_id = current_setting('haajar.lifecycle_group_id')::uuid
       and user_id = '10000000-0000-4000-8000-000000000002')
  )$$,
  '42501',
  'an unrelated user cannot retrieve a member QR credential'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select is(
  (select qr_token from public.review_join_request(
    current_setting('haajar.accept_request_id')::uuid, 'accept', null
  )),
  null::text,
  'repeated acceptance is idempotent and does not issue another token'
);
reset role;

select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000004', true);
set local role authenticated;
select lives_ok(
  format(
    'select public.submit_join_request(%L::uuid, %L::jsonb)',
    current_setting('haajar.lifecycle_group_id'),
    jsonb_build_array(
      jsonb_build_object(
        'question_id',
        current_setting('haajar.register_question_id')::uuid,
        'answer', 'PTA23CS099'
      ),
      jsonb_build_object(
        'question_id',
        current_setting('haajar.batch_question_id')::uuid,
        'answer', '2028'
      )
    )::text
  ),
  'a second user can submit a request for rejection testing'
);
reset role;

select set_config(
  'haajar.reject_request_id',
  (select id::text from public.join_requests
   where group_id = current_setting('haajar.lifecycle_group_id')::uuid
     and user_id = '10000000-0000-4000-8000-000000000004'),
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select lives_ok(
  $$select * from public.review_join_request(
    current_setting('haajar.reject_request_id')::uuid, 'reject', 'No seats available'
  )$$,
  'a manager can reject a pending request'
);
reset role;

select is(
  (select count(*)::integer from public.group_memberships
   where group_id = current_setting('haajar.lifecycle_group_id')::uuid
     and user_id = '10000000-0000-4000-8000-000000000004'),
  0,
  'a rejected request creates no group membership'
);
select is(
  (select count(*)::integer from public.event_members
   where event_id = current_setting('haajar.lifecycle_event_id')::uuid
     and user_id = '10000000-0000-4000-8000-000000000004'),
  0,
  'a rejected request creates no event membership'
);
select is(
  (select count(*)::integer from public.qr_credentials as credential
   join public.group_memberships as membership
     on membership.id = credential.group_membership_id
   where membership.user_id = '10000000-0000-4000-8000-000000000004'),
  0,
  'a rejected request creates no QR credential'
);

select set_config(
  'haajar.old_qr_id',
  (select credential.id::text from public.qr_credentials as credential
   join public.group_memberships as membership
     on membership.id = credential.group_membership_id
   where membership.user_id = '10000000-0000-4000-8000-000000000002'
     and credential.status = 'active'),
  true
);
select set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
set local role authenticated;
select ok(
  (select qr_token is not null from public.change_group_membership_role(
    (select id from public.group_memberships
     where group_id = current_setting('haajar.lifecycle_group_id')::uuid
       and user_id = '10000000-0000-4000-8000-000000000002'),
    'co_organiser'
  )),
  'an authorised role change returns a replacement QR token'
);
reset role;

select is(
  (select status from public.qr_credentials
   where id = current_setting('haajar.old_qr_id')::uuid),
  'revoked',
  'a role change revokes the old QR credential'
);
select is(
  (select count(*)::integer from public.qr_credentials as credential
   join public.group_memberships as membership
     on membership.id = credential.group_membership_id
   where membership.user_id = '10000000-0000-4000-8000-000000000002'
     and credential.status = 'active' and credential.version = 2),
  1,
  'a role change issues one new versioned QR credential'
);
select ok(
  (select count(*) >= 8 from public.audit_logs
   where group_id = current_setting('haajar.lifecycle_group_id')::uuid),
  'publication, submissions, reviews, memberships, QR issuance and role changes are audited'
);

select * from finish();
rollback;
