-- ===========================================================================
--  CM EVENT LEADS · 07 — ADMIN USER MANAGEMENT
-- ---------------------------------------------------------------------------
--  Run AFTER 03_functions.sql (it needs public.is_admin()).
--
--  These functions power the "Utilizatori" screen in the admin area, where an
--  existing administrator can see who has access and grant / revoke it.
--
--  WHY A FUNCTION AND NOT A PLAIN TABLE QUERY?
--  The list of login accounts lives in auth.users, which the browser is never
--  allowed to read. These functions are SECURITY DEFINER, so they can look up
--  a single account BY E-MAIL on the server, and they check public.is_admin()
--  first — a visitor or a logged-in non-admin gets nothing.
--
--  The password itself is NEVER touched here. Creating the login (and its
--  password) stays in the Supabase Dashboard: Authentication -> Users ->
--  Add user -> Create new user (tick "Auto Confirm User"). Afterwards the
--  administrator links that account from inside the app with one click.
-- ===========================================================================

-- ---------------------------------------------------------------------------
--  Who currently has access?
--  Returns one row per administrator, with the e-mail of the login account
--  and whether that account has ever signed in.
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_users()
returns table (
  id            uuid,
  email         text,
  full_name     text,
  role          text,
  is_active     boolean,
  created_at    timestamptz,
  last_sign_in  timestamptz,
  is_self       boolean
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  return query
    select
      p.id,
      coalesce(p.email, u.email)::text as email,
      p.full_name,
      p.role,
      p.is_active,
      p.created_at,
      u.last_sign_in_at              as last_sign_in,
      (p.id = auth.uid())            as is_self
    from public.admin_profiles p
    left join auth.users u on u.id = p.id
    order by p.is_active desc, lower(coalesce(p.email, u.email));
end;
$$;

revoke all on function public.admin_list_users() from public, anon;
grant execute on function public.admin_list_users() to authenticated;

-- ---------------------------------------------------------------------------
--  Give an existing login account access to the admin area.
--  p_email must belong to an account that already exists in Supabase Auth.
--  Raises AUTH_USER_NOT_FOUND if it does not — the UI turns that into a short
--  explanation of how to create the login first.
-- ---------------------------------------------------------------------------
create or replace function public.grant_admin_by_email(
  p_email text,
  p_name  text default null,
  p_role  text default 'admin'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_email text := lower(trim(coalesce(p_email, '')));
  v_role  text := coalesce(nullif(trim(p_role), ''), 'admin');
  v_uid   uuid;
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  if v_email = '' then
    raise exception 'EMAIL_REQUIRED';
  end if;

  if v_role not in ('admin', 'viewer') then
    raise exception 'INVALID_ROLE';
  end if;

  select id into v_uid from auth.users where lower(email) = v_email;

  if v_uid is null then
    raise exception 'AUTH_USER_NOT_FOUND';
  end if;

  insert into public.admin_profiles (id, email, full_name, role, is_active)
  values (v_uid, v_email, nullif(trim(coalesce(p_name, '')), ''), v_role, true)
  on conflict (id) do update
    set email     = excluded.email,
        full_name = coalesce(excluded.full_name, public.admin_profiles.full_name),
        role      = excluded.role,
        is_active = true;

  return v_uid;
end;
$$;

revoke all on function public.grant_admin_by_email(text, text, text) from public, anon;
grant execute on function public.grant_admin_by_email(text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
--  Activate / deactivate, or change the role, of another administrator.
--  An administrator can never lock themselves out: p_id = auth.uid() is
--  rejected, so there is always at least one way back in.
-- ---------------------------------------------------------------------------
create or replace function public.set_admin_access(
  p_id     uuid,
  p_active boolean default null,
  p_role   text    default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  if p_id = auth.uid() then
    raise exception 'CANNOT_MODIFY_SELF';
  end if;

  if p_role is not null and p_role not in ('admin', 'viewer') then
    raise exception 'INVALID_ROLE';
  end if;

  update public.admin_profiles
     set is_active = coalesce(p_active, is_active),
         role      = coalesce(p_role, role)
   where id = p_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.set_admin_access(uuid, boolean, text) from public, anon;
grant execute on function public.set_admin_access(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
--  Remove an administrator completely (the login account itself stays in
--  Supabase Auth — only the admin-area access is withdrawn).
-- ---------------------------------------------------------------------------
create or replace function public.revoke_admin(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'NOT_AUTHORISED';
  end if;

  if p_id = auth.uid() then
    raise exception 'CANNOT_MODIFY_SELF';
  end if;

  delete from public.admin_profiles where id = p_id;

  if not found then
    raise exception 'NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.revoke_admin(uuid) from public, anon;
grant execute on function public.revoke_admin(uuid) to authenticated;

-- ===========================================================================
--  DONE.
-- ===========================================================================
