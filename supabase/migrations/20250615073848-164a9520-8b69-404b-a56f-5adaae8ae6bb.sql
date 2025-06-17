
-- Create user profiles table for additional user information
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  roll_number TEXT UNIQUE NOT NULL,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on all tables
ALTER TABLE public.elections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users_biometrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_profiles
CREATE POLICY "Users can view their own profile" ON public.user_profiles
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile" ON public.user_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" ON public.user_profiles
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all profiles" ON public.user_profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS policies for elections
CREATE POLICY "Everyone can view elections" ON public.elections
  FOR SELECT TO public USING (TRUE);

CREATE POLICY "Only admins can manage elections" ON public.elections
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS policies for candidates
CREATE POLICY "Everyone can view candidates" ON public.candidates
  FOR SELECT TO public USING (TRUE);

CREATE POLICY "Only admins can manage candidates" ON public.candidates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS policies for votes
CREATE POLICY "Users can view their own votes" ON public.votes
  FOR SELECT USING (auth.uid() = voter_id);

CREATE POLICY "Users can insert their own votes" ON public.votes
  FOR INSERT WITH CHECK (auth.uid() = voter_id);

CREATE POLICY "Admins can view all votes" ON public.votes
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() AND is_admin = TRUE
    )
  );

-- RLS policies for users_biometrics
CREATE POLICY "Users can view their own biometrics" ON public.users_biometrics
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own biometrics" ON public.users_biometrics
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own biometrics" ON public.users_biometrics
  FOR UPDATE USING (auth.uid() = user_id);

-- Function to check if user has already voted in an election
CREATE OR REPLACE FUNCTION public.has_user_voted(election_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.votes 
    WHERE election_id = election_uuid AND voter_id = user_uuid
  );
END;
$$;

-- Function to get vote counts for an election
CREATE OR REPLACE FUNCTION public.get_vote_counts(election_uuid UUID)
RETURNS TABLE (
  candidate_id UUID,
  candidate_name TEXT,
  vote_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id,
    c.name,
    COUNT(v.id)::BIGINT as vote_count
  FROM public.candidates c
  LEFT JOIN public.votes v ON c.id = v.candidate_id AND v.election_id = election_uuid
  WHERE c.election_id = election_uuid
  GROUP BY c.id, c.name
  ORDER BY vote_count DESC;
END;
$$;

-- Create a sample election (only if it doesn't exist)
INSERT INTO public.elections (id, name, created_at)
SELECT 
  gen_random_uuid(),
  'Student Council Election 2024',
  NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.elections WHERE name = 'Student Council Election 2024'
);

-- Function to handle new user registration and create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (user_id, full_name, roll_number, is_admin)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'roll_number', 'TEMP_' || substring(NEW.id::text, 1, 8)),
    COALESCE((NEW.raw_user_meta_data->>'is_admin')::boolean, FALSE)
  );
  RETURN NEW;
END;
$$;

-- Trigger to automatically create user profile when user signs up
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
