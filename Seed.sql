-- ─────────────────────────────────────────────
-- Dear Bloom — Default Admin User Seed
-- Run ONCE in: Supabase Dashboard → SQL Editor
-- ─────────────────────────────────────────────
-- Creates the default admin account:
--   Email:    dearbloom.admin@dearbloom.com
--   Password: DearBloom_Admin2026!
--
-- Supabase Auth requires an email, so the
-- "username" DearBloom_Admin is encoded as
-- the email prefix for easy recognition.
-- ─────────────────────────────────────────────

-- Safety check: only insert if the user doesn't exist yet
do $$
declare
  existing_id uuid;
begin
  select id into existing_id
  from auth.users
  where email = 'dearbloom.admin@dearbloom.com';

  if existing_id is null then
    insert into auth.users (
      id,
      instance_id,
      role,
      aud,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) values (
      gen_random_uuid(),                          -- id
      '00000000-0000-0000-0000-000000000000',     -- instance_id (default)
      'authenticated',                            -- role
      'authenticated',                            -- aud
      'dearbloom.admin@dearbloom.com',            -- email
      crypt('DearBloom_Admin2026!', gen_salt('bf')), -- hashed password
      now(),                                      -- email pre-confirmed
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"DearBloom_Admin"}'::jsonb,    -- stored in user metadata
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    raise notice 'Admin user created successfully.';
  else
    raise notice 'Admin user already exists — skipping.';
  end if;
end $$;
