
-- 1. Add created_by column (already added in previous migration; safe to run again)
ALTER TABLE public.elections
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Set created_by for existing rows to admin user (if missing)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@vsc.example.com';
  UPDATE public.elections SET created_by = admin_id WHERE created_by IS NULL;
END;
$$;

-- 3. Add unique constraint on name IF it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
      WHERE conname = 'elections_name_unique'
  ) THEN
    ALTER TABLE public.elections
      ADD CONSTRAINT elections_name_unique UNIQUE (name);
  END IF;
END;
$$;

-- 4. Insert Demo Student Council Election (owned by admin)
DO $$
DECLARE
  admin_id UUID;
BEGIN
  SELECT id INTO admin_id FROM auth.users WHERE email = 'admin@vsc.example.com';
  INSERT INTO public.elections (id, name, created_at, created_by)
    VALUES (
      gen_random_uuid(),
      'Demo Student Council Election',
      NOW(),
      admin_id
    )
  ON CONFLICT (name) DO NOTHING;
END;
$$;
