
-- Drop transfer_logs first (has FK to projects)
DROP TABLE IF EXISTS public.transfer_logs;

-- Drop projects table
DROP TABLE IF EXISTS public.projects;

-- Drop profiles table
DROP TABLE IF EXISTS public.profiles;

-- Drop the trigger function for handle_new_user (attached to auth.users)
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

-- Drop the updated_at trigger function
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
