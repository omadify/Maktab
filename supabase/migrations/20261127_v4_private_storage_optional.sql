-- ============================================================================
-- OPTIONAL PRIVATE STORAGE MIGRATION (APPLY AFTER DEPLOYING SIGNED-URL HANDLER)
-- ============================================================================
-- WARNING: Making 'proofs' private immediately prevents existing direct
-- /storage/v1/object/public/proofs/... URLs in `entries.fpath` from opening
-- unless your frontend/Edge Function generates short-lived signed URLs.
-- See SECURITY_REPORT.md & DATABASE_MIGRATION.md before running.
-- ============================================================================

begin;

update storage.buckets
set public = false
where id = 'proofs';

drop policy if exists "proofs_public_read" on storage.objects;
drop policy if exists "proofs_public_insert" on storage.objects;

-- Allow authenticated uploads only into proofs bucket via signed/authenticated policy
create policy "proofs_authenticated_insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'proofs');

commit;
