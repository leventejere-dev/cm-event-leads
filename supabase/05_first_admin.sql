-- ===========================================================================
--  CM EVENT LEADS · 05 — CREATE THE FIRST ADMINISTRATOR
-- ---------------------------------------------------------------------------
--  Creating a user in Supabase Auth is NOT enough to get into /admin.
--  The user also needs a row in public.admin_profiles.
--
--  STEP 1 (in the Supabase Dashboard):
--     Authentication -> Users -> "Add user" -> "Create new user"
--     E-mail:    lucian@color-metal.ro       (use a real internal address)
--     Password:  <a strong password>
--     Tick "Auto Confirm User" so no confirmation e-mail is needed.
--
--  STEP 2: change the e-mail below and run this script.
-- ===========================================================================

-- >>> CHANGE THIS LINE <<<
do $$
declare
  v_email text := 'lucian@color-metal.ro';   -- <-- your admin e-mail
  v_name  text := 'Lucian';                  -- <-- display name
  v_uid   uuid;
begin
  select id into v_uid from auth.users where lower(email) = lower(v_email);

  if v_uid is null then
    raise exception
      'No auth user found with e-mail %. Create it first under Authentication -> Users.',
      v_email;
  end if;

  insert into public.admin_profiles (id, email, full_name, role, is_active)
  values (v_uid, v_email, v_name, 'admin', true)
  on conflict (id) do update
    set email     = excluded.email,
        full_name = excluded.full_name,
        role      = 'admin',
        is_active = true;

  raise notice 'Admin profile ready for % (%).', v_email, v_uid;
end $$;

-- ---------------------------------------------------------------------------
--  Adding more admins later: repeat the two steps above with another e-mail,
--  or use Admin -> Settings once you are logged in.
--
--  Removing an admin (keeps the login, blocks the admin area):
--      update public.admin_profiles set is_active = false
--       where lower(email) = lower('someone@color-metal.ro');
-- ---------------------------------------------------------------------------
