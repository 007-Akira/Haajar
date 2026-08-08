begin;
create extension if not exists pgtap with schema extensions;
select no_plan();

insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,
  raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','23000000-0000-4000-8000-000000000001','authenticated','authenticated','hierarchy-owner@haajar.local','',now(),'{}','{"full_name":"Hierarchy Owner"}',now(),now()),
('00000000-0000-0000-0000-000000000000','23000000-0000-4000-8000-000000000002','authenticated','authenticated','hierarchy-outsider@haajar.local','',now(),'{}','{"full_name":"Hierarchy Outsider"}',now(),now());

select set_config('request.jwt.claim.sub','23000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select set_config('ht.event1',public.create_event('Hierarchy Event One',null)::text,true);
select set_config('ht.event2',public.create_event('Hierarchy Event Two',null)::text,true);
select set_config('ht.category1',public.create_category_group(current_setting('ht.event1')::uuid,'Transport',null)::text,true);
select set_config('ht.category2',public.create_category_group(current_setting('ht.event2')::uuid,'Rooms',null)::text,true);
select set_config('ht.unit1',public.create_operational_group(current_setting('ht.category1')::uuid,'Bus 1',null)::text,true);
select set_config('ht.unit2',public.create_operational_group(current_setting('ht.category1')::uuid,'Bus 2',null)::text,true);
reset role;

select is((select group_kind from public.groups where id=current_setting('ht.category1')::uuid),
  'category','authorised category creation succeeds');
select is((select parent_group_id from public.groups where id=current_setting('ht.unit1')::uuid),
  current_setting('ht.category1')::uuid,'operational subgroup has the requested category parent');

select throws_ok(format('update public.groups set parent_group_id=%L::uuid where id=%L::uuid',
  current_setting('ht.category2'),current_setting('ht.unit1')),'23514',null,
  'cross-event category parent is rejected');
select throws_ok(format('update public.groups set parent_group_id=id where id=%L::uuid',
  current_setting('ht.unit1')),'23514',null,'self-parent is rejected');
select throws_ok(format($sql$insert into public.groups(event_id,name,created_by,status,group_kind,parent_group_id)
  values(%L::uuid,'Invalid child',%L::uuid,'active','operational',%L::uuid)$sql$,
  current_setting('ht.event1'),'23000000-0000-4000-8000-000000000001',current_setting('ht.unit1')),
  '23514',null,'an operational group cannot be used as a parent');
select throws_ok(format('update public.groups set parent_group_id=%L::uuid where id=%L::uuid',
  current_setting('ht.unit1'),current_setting('ht.category1')),'23514',null,
  'a category-to-child cycle is rejected');

select set_config('request.jwt.claim.sub','23000000-0000-4000-8000-000000000002',true);
set local role authenticated;
select throws_ok(format('select public.create_category_group(%L::uuid,%L,null)',
  current_setting('ht.event1'),'Forbidden Category'),'42501',null,
  'an unrelated user cannot create a category');
reset role;

select set_config('ht.membership',(select id::text from public.group_memberships
  where group_id=current_setting('ht.category1')::uuid
    and user_id='23000000-0000-4000-8000-000000000001'),true);
select set_config('request.jwt.claim.sub','23000000-0000-4000-8000-000000000001',true);
set local role authenticated;
select throws_ok(format('select * from public.transfer_operational_group_membership(%L::uuid,%L::uuid)',
  current_setting('ht.membership'),current_setting('ht.category2')),'22023',null,
  'transfer rejects a non-sibling target');
reset role;

select * from finish();
rollback;
