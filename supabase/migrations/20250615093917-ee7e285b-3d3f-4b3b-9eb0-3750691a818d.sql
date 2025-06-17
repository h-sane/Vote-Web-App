
-- CREATE DEFAULT ADMIN USER (replace these values if you wish)
insert into auth.users (id, email, encrypted_password, email_confirmed_at, raw_user_meta_data, is_sso_user)
values (
  gen_random_uuid(),
  'admin@vsc.example.com', -- CHANGE ME if needed
  crypt('AdminDemo123!', gen_salt('bf')), -- CHANGE ME if needed
  now(),
  jsonb_build_object('full_name', 'Default Admin', 'roll_number', 'ADMIN-001', 'is_admin', true),
  false
);

-- Fix admin user in user_profiles, if not set already
update user_profiles
set is_admin = true
where roll_number = 'ADMIN-001';
