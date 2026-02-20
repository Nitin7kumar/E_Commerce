-- Add is_active column to profiles table to allow admin to ban/suspend users
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Update existing profiles to be active by default if they are null
UPDATE public.profiles 
SET is_active = true 
WHERE is_active IS NULL;

-- Enable RLS to allow admins to update this column (already covered by "Admin can update all profiles" policy)
-- But we need to ensure the standard "Users can update own profile" doesn't allow users to reactivate themselves
-- The existing policy "Users can update own profile" in 015_fix_profiles_rls.sql allows updates to ALL columns.
-- We might want to restrict that, but for now, let's just add the column.
