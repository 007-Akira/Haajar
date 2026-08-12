begin;
create extension if not exists pgtap with schema extensions;
select no_plan();
insert into auth.users(instance_id,id,aud,role,email,encrypted_password,email_confirmed_at,raw_app_meta_data,raw_user_meta_data,created_at,updated_at) values
('00000000-0000-0000-0000-000000000000','24000000-0000-4000-8000-000000000001','authenticated','authenticated','admin@hierarchy.local','',now(),'{}','{"full_name":"Admin"}',now(),now()),
('00000000-0000-0000-0000-000000000000','24000000-0000-4000-8000-000000000002','authenticated','authenticated','member@hierarchy.local','',now(),'{}','{"full_name":"Member"}',now(),now()),
('00000000-0000-0000-0000-000000000000','24000000-0000-4000-8000-000000000003','authenticated','authenticated','other@hierarchy.local','',now(),'{}','{"full_name":"Other"}',now(),now());
select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000001',true); set local role authenticated;
select set_config('ha.event',public.create_event('Admin Access Event',null)::text,true);
select set_config('ha.category',public.create_category_group(current_setting('ha.event')::uuid,'Bus',null)::text,true);
select set_config('ha.bus1',public.create_operational_group(current_setting('ha.category')::uuid,'Bus 1',null)::text,true);
select set_config('ha.bus2',public.create_operational_group(current_setting('ha.category')::uuid,'Bus 2',null)::text,true); reset role;
delete from public.group_memberships where group_id=current_setting('ha.category')::uuid
  and user_id='24000000-0000-4000-8000-000000000001';
insert into public.event_members(event_id,user_id,role,status) values
(current_setting('ha.event')::uuid,'24000000-0000-4000-8000-000000000002','member','active');
select is((select count(*)::integer from public.group_memberships where group_id=current_setting('ha.bus1')::uuid),0,'new subgroup has no fake admin membership');
select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000001',true); set local role authenticated;
select is(public.get_group_access(current_setting('ha.category')::uuid),'event_admin','super organiser opens category without membership');
select is(public.get_group_access(current_setting('ha.bus1')::uuid),'event_admin','super organiser opens subgroup without membership');
select is((select count(*)::integer from public.qr_credentials q join public.group_memberships gm on gm.id=q.group_membership_id where gm.user_id='24000000-0000-4000-8000-000000000001' and gm.group_id in (current_setting('ha.category')::uuid,current_setting('ha.bus1')::uuid)),0,'admin access creates no membership QR');
select is(public.assign_event_member_to_operational_group(current_setting('ha.bus1')::uuid,'24000000-0000-4000-8000-000000000002'),'assigned','super organiser assigns active trip member');
select is(public.assign_event_member_to_operational_group(current_setting('ha.bus1')::uuid,'24000000-0000-4000-8000-000000000002'),'already_member','already-member outcome is canonical');
select is(public.assign_event_member_to_operational_group(current_setting('ha.bus2')::uuid,'24000000-0000-4000-8000-000000000002'),'sibling_membership_exists','direct sibling assignment is rejected');
select is((select active_member_count::integer from public.list_event_groups_with_participation_counts(current_setting('ha.event')::uuid) where id=current_setting('ha.category')::uuid),1,'category counts unique operational participants only');
select is((select count(*)::integer from public.qr_credentials q join public.group_memberships gm on gm.id=q.group_membership_id where gm.group_id=current_setting('ha.bus1')::uuid),1,'real assignment issues a member QR'); reset role;
select set_config('request.jwt.claim.sub','24000000-0000-4000-8000-000000000003',true); set local role authenticated;
select is(public.get_group_access(current_setting('ha.bus1')::uuid),'unauthorised','unrelated user is denied');
select is(public.assign_event_member_to_operational_group(current_setting('ha.bus1')::uuid,'24000000-0000-4000-8000-000000000003'),'unauthorised','unrelated caller cannot assign'); reset role;
select * from finish(); rollback;
