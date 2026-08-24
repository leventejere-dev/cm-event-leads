-- ===========================================================================
--  CM EVENT LEADS · 04 — SIGNATURE STORAGE
-- ---------------------------------------------------------------------------
--  Run AFTER 03_functions.sql.
--
--  Signatures are PNG images drawn on an HTML5 canvas. They are uploaded to a
--  PRIVATE Supabase Storage bucket called "signatures".
--    * the tablet (anon key) may only UPLOAD  — it can never list or read
--    * admins may read, and admins may delete
--    * the admin UI reads a signature through a short-lived signed URL
--
--  If the upload fails (typically: no internet at the venue) the front-end
--  falls back to storing the PNG as base64 inside registrations.signature_data,
--  so a signature is never lost.
-- ===========================================================================

-- Create the bucket (private, 2 MB per file, PNG only)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('signatures', 'signatures', false, 2097152, array['image/png'])
on conflict (id) do update
  set public             = false,
      file_size_limit    = 2097152,
      allowed_mime_types = array['image/png'];

-- Clean up previous policies so this file can be re-run
drop policy if exists "cm_signatures_anon_insert"    on storage.objects;
drop policy if exists "cm_signatures_admin_select"   on storage.objects;
drop policy if exists "cm_signatures_admin_delete"   on storage.objects;
drop policy if exists "cm_signatures_admin_update"   on storage.objects;

-- Visitors / tablets may upload only.
create policy "cm_signatures_anon_insert"
  on storage.objects for insert
  to anon, authenticated
  with check (bucket_id = 'signatures');

-- Only admins may read the images.
create policy "cm_signatures_admin_select"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'signatures' and public.is_admin());

create policy "cm_signatures_admin_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'signatures' and public.is_admin())
  with check (bucket_id = 'signatures' and public.is_admin());

create policy "cm_signatures_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'signatures' and public.is_admin());

-- ===========================================================================
--  DONE. Optional next: 05_seed.sql (demo event) — see the README.
-- ===========================================================================
