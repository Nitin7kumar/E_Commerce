-- =====================================================
-- TRIGGER: Auto-create seller when user signs up as seller
-- =====================================================
-- This trigger fires AFTER a user is created in auth.users
-- If the user has is_seller: true in metadata, create seller record
-- =====================================================

-- First, insert missing sellers from existing auth users
INSERT INTO sellers (user_id, store_name, contact_email, is_active, is_verified)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'store_name', 'Unnamed Store'),
  email,
  false,  -- Start inactive, admin must activate
  false
FROM auth.users
WHERE 
  (raw_user_meta_data->>'is_seller')::boolean = true
  AND id NOT IN (SELECT user_id FROM sellers)
ON CONFLICT (user_id) DO NOTHING;

-- Check how many were inserted
SELECT 'Inserted missing sellers' as status, COUNT(*) as count FROM sellers;

-- Now create a trigger for future signups
CREATE OR REPLACE FUNCTION create_seller_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if user signed up as seller
  IF (NEW.raw_user_meta_data->>'is_seller')::boolean = true THEN
    INSERT INTO sellers (user_id, store_name, contact_email, is_active, is_verified)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'store_name', 'Unnamed Store'),
      NEW.email,
      false,  -- Admin must activate
      false
    )
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created_seller ON auth.users;

-- Create the trigger
CREATE TRIGGER on_auth_user_created_seller
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_seller_on_signup();

-- Verify sellers table now has data
SELECT id, user_id, store_name, contact_email, is_active FROM sellers;

SELECT 'Trigger created! Future seller signups will auto-create seller records.' as status;
