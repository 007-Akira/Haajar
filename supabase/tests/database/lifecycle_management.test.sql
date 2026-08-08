begin;
create extension if not exists pgtap with schema extensions;
select plan(22);

select has_table('public','user_group_preferences','personal archive preferences exist');
select is((select relrowsecurity from pg_class where oid='public.user_group_preferences'::regclass),true,'personal preferences enforce RLS');

select has_function('public','update_event',array['uuid','text','text'],'trip edit RPC exists');
select has_function('public','archive_event',array['uuid'],'trip archive RPC exists');
select has_function('public','delete_event',array['uuid'],'trip delete RPC exists');
select has_function('public','get_event_delete_eligibility',array['uuid'],'trip eligibility RPC exists');
select has_function('public','update_group',array['uuid','text','text'],'group edit RPC exists');
select has_function('public','archive_group',array['uuid'],'group archive RPC exists');
select has_function('public','delete_group',array['uuid'],'group delete RPC exists');
select has_function('public','get_group_delete_eligibility',array['uuid'],'group eligibility RPC exists');
select has_function('public','set_my_group_archived',array['uuid','boolean'],'personal archive RPC exists');

select is(has_function_privilege('authenticated','public.archive_event(uuid)','EXECUTE'),true,'authenticated can call archive event RPC');
select is(has_function_privilege('authenticated','public.archive_group(uuid)','EXECUTE'),true,'authenticated can call archive group RPC');
select is(has_function_privilege('authenticated','public.delete_event(uuid)','EXECUTE'),true,'authenticated can call delete event RPC');
select is(has_function_privilege('authenticated','public.delete_group(uuid)','EXECUTE'),true,'authenticated can call delete group RPC');

select is(proconfig,array['search_path='], 'event archive has an empty fixed search path')
from pg_proc where oid='public.archive_event(uuid)'::regprocedure;
select is(proconfig,array['search_path='], 'group archive has an empty fixed search path')
from pg_proc where oid='public.archive_group(uuid)'::regprocedure;
select is(proconfig,array['search_path='], 'event delete has an empty fixed search path')
from pg_proc where oid='public.delete_event(uuid)'::regprocedure;
select is(proconfig,array['search_path='], 'group delete has an empty fixed search path')
from pg_proc where oid='public.delete_group(uuid)'::regprocedure;

select is(has_table_privilege('authenticated','public.events','UPDATE'),false,'direct trip updates are revoked');
select is(has_table_privilege('authenticated','public.groups','UPDATE'),false,'direct group updates are revoked');
select is(has_table_privilege('authenticated','public.user_group_preferences','DELETE'),true,'users can clear their own preference under RLS');

select * from finish();
rollback;
