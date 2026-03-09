-- Create initial admin user
-- Run this after setting up your Supabase project

-- First, create the admin user through Supabase Auth dashboard or API
-- Then run this SQL to set their role to ADMIN

-- Example: Update the first user to be admin
UPDATE users
SET role = 'ADMIN'
WHERE id = (
  SELECT id FROM users
  ORDER BY created_at ASC
  LIMIT 1
);

-- Alternative: If you know the user ID, replace 'user-id-here' with actual ID
-- UPDATE users SET role = 'ADMIN' WHERE id = 'user-id-here';