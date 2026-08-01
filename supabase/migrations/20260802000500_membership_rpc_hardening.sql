begin;

-- Membership lifecycle changes must pass through secured RPCs so role checks,
-- QR rotation, and audit logging cannot be bypassed by direct table writes.
revoke insert, update, delete on public.group_memberships from authenticated;

commit;
