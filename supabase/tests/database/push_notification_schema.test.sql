begin;

create extension if not exists pgtap with schema extensions;
select no_plan();

select has_table('public', 'push_devices', 'push devices support multiple user devices');
select has_table('public', 'notification_preferences', 'notification preferences exist');
select has_table('public', 'notification_jobs', 'deduplicated notification jobs exist');
select has_table('public', 'notification_deliveries', 'delivery attempts are recorded');

select ok(
  (select bool_and(relrowsecurity) from pg_class
   where oid in (
     'public.push_devices'::regclass,
     'public.notification_preferences'::regclass,
     'public.notification_jobs'::regclass,
     'public.notification_deliveries'::regclass
   )),
  'all public notification tables have RLS enabled'
);

select ok(
  not has_table_privilege('authenticated', 'public.push_devices', 'INSERT')
  and not has_table_privilege('authenticated', 'public.push_devices', 'UPDATE')
  and not has_table_privilege('authenticated', 'public.notification_jobs', 'SELECT')
  and not has_table_privilege('authenticated', 'public.notification_deliveries', 'SELECT'),
  'mobile clients cannot access device secrets or delivery queues directly'
);

select has_function(
  'public', 'register_push_device', array['text', 'text', 'uuid'],
  'secured device registration RPC exists'
);
select has_function(
  'public', 'revoke_push_device', array['uuid'],
  'secured device revocation RPC exists'
);
select ok(
  has_function_privilege(
    'authenticated', 'public.register_push_device(text, text, uuid)', 'EXECUTE'
  )
  and not has_function_privilege(
    'anon', 'public.register_push_device(text, text, uuid)', 'EXECUTE'
  )
  and not has_function_privilege(
    'authenticated', 'public.claim_push_deliveries(integer)', 'EXECUTE'
  ),
  'registration is authenticated and delivery claiming is server-only'
);

select ok(
  exists (
    select 1 from pg_constraint
    where conrelid = 'public.notification_jobs'::regclass
      and contype = 'u'
      and pg_get_constraintdef(oid) like '%dedupe_key%'
  ),
  'notification jobs prevent duplicate logical sends'
);

select ok(
  exists (
    select 1 from pg_indexes
    where schemaname = 'public'
      and tablename = 'push_devices'
      and indexname = 'push_devices_active_token_idx'
      and indexdef like '%WHERE (status = ''active''%'
  ),
  'only one active device registration can own a push token'
);

select ok(
  not exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name in ('notification_jobs', 'notification_deliveries')
      and column_name in ('phone', 'email', 'qr_token', 'registration_answers')
  ),
  'delivery logs contain no sensitive member payload fields'
);

select * from finish();
rollback;
