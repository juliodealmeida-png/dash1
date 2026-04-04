-- Onboarding profile data (first-login collection)
-- Only accessible by Admin role users via RLS
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  birthday DATE,
  gender TEXT CHECK (gender IN ('masculino','feminino','outro','prefiro_nao_dizer')),
  role TEXT NOT NULL DEFAULT 'sdr' CHECK (role IN ('founder','admin','ae','sdr','csm')),
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- RLS: only service_role and admin users can read all profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_role_all" ON user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- Users can read/update their own profile
CREATE POLICY "own_profile_select" ON user_profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "own_profile_update" ON user_profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admin role can read all profiles (via a function check)
CREATE OR REPLACE FUNCTION is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'founder')
  );
$$ LANGUAGE sql SECURITY DEFINER;

CREATE POLICY "admin_read_all" ON user_profiles
  FOR SELECT TO authenticated
  USING (is_admin_user());

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON user_profiles(email);
