-- Fix existing admin user
-- Run this if you created the admin user in Supabase Auth but it's not in the users table

-- Replace 'admin@maestro.com' with your actual admin email
INSERT INTO users (id, email, username, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'username', split_part(au.email, '@', 1), 'Admin'),
  'ADMIN',
  au.created_at,
  NOW()
FROM auth.users au
WHERE au.email = 'admin@maestro.com'
  AND NOT EXISTS (
    SELECT 1 FROM users u WHERE u.id = au.id
  );

-- Alternative: Update existing user to admin
-- UPDATE users SET role = 'ADMIN' WHERE email = 'admin@maestro.com';