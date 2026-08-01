begin;

create extension if not exists pgtap with schema extensions;
select plan(32);

select has_table('public', 'registration_forms', 'registration_forms exists');
select has_table('public', 'registration_questions', 'registration_questions exists');
select has_table('public', 'registration_options', 'registration_options exists');
select has_table('public', 'join_requests', 'join_requests exists');
select has_table('public', 'registration_answers', 'registration_answers exists');
select has_table('public', 'qr_credentials', 'qr_credentials exists');
select has_table('public', 'audit_logs', 'audit_logs exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.registration_forms'::regclass),
  'registration_forms has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.registration_questions'::regclass),
  'registration_questions has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.registration_options'::regclass),
  'registration_options has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.join_requests'::regclass),
  'join_requests has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.registration_answers'::regclass),
  'registration_answers has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.qr_credentials'::regclass),
  'qr_credentials has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.audit_logs'::regclass),
  'audit_logs has RLS enabled'
);

select has_index(
  'public',
  'join_requests',
  'join_requests_one_pending_per_user_group_idx',
  'only one pending join request is allowed per user and group'
);
select has_index(
  'public',
  'qr_credentials',
  'qr_credentials_one_active_per_membership_idx',
  'only one active QR credential is allowed per membership'
);

select ok(
  not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'registration_forms',
        'registration_questions',
        'registration_options',
        'join_requests',
        'registration_answers',
        'qr_credentials',
        'audit_logs'
      )
      and (qual = 'true' or with_check = 'true')
  ),
  'new tables have no permissive true policies'
);
select ok(
  not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'qr_credentials'
      and column_name in ('token', 'raw_token', 'qr_token')
  ),
  'QR credentials do not store plaintext token columns'
);
select has_trigger(
  'public',
  'registration_forms',
  'registration_forms_enforce_lifecycle',
  'registration form lifecycle is enforced'
);
select has_trigger(
  'public',
  'registration_questions',
  'registration_questions_require_draft_form',
  'published questions are immutable'
);
select has_trigger(
  'public',
  'registration_options',
  'registration_options_require_draft_form',
  'published options are immutable'
);
select has_trigger(
  'public',
  'registration_answers',
  'registration_answers_enforce_scope',
  'answers must belong to the requested group form'
);
select ok(
  not has_table_privilege('authenticated', 'public.qr_credentials', 'SELECT'),
  'clients cannot read QR credential hashes directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.registration_answers', 'UPDATE'),
  'clients cannot modify submitted answers directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.join_requests', 'INSERT'),
  'clients cannot create incomplete join requests directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.audit_logs', 'INSERT'),
  'clients cannot forge audit records directly'
);
select ok(
  not has_table_privilege('authenticated', 'public.group_memberships', 'UPDATE'),
  'clients cannot bypass role-change QR rotation through direct membership updates'
);
select has_function(
  'public',
  'resolve_membership_qr',
  array['text', 'uuid'],
  'secured membership QR resolver exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.resolve_membership_qr(text, uuid)'::regprocedure),
  'membership QR resolver is security definer'
);
select ok(
  (select proconfig @> array['search_path='] from pg_proc
   where oid = 'public.resolve_membership_qr(text, uuid)'::regprocedure),
  'membership QR resolver has an empty fixed search path'
);
select ok(
  has_function_privilege('authenticated', 'public.resolve_membership_qr(text, uuid)', 'EXECUTE'),
  'authenticated callers may execute the secured resolver'
);
select ok(
  not has_function_privilege('anon', 'public.resolve_membership_qr(text, uuid)', 'EXECUTE'),
  'anonymous callers cannot execute the membership QR resolver'
);

select * from finish();
rollback;
