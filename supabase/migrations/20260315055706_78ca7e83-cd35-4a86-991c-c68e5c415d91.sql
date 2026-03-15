
CREATE TABLE public.stories (
  id TEXT PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  researcher_id TEXT,
  district TEXT,
  village TEXT,
  scheme TEXT,
  narrative TEXT,
  validated BOOLEAN DEFAULT FALSE,
  answers JSONB NOT NULL DEFAULT '{}',
  scores JSONB NOT NULL DEFAULT '{}',
  impact_scores JSONB NOT NULL DEFAULT '{}',
  settlement_type TEXT,
  income_range TEXT,
  age_group TEXT,
  education_level TEXT,
  social_category TEXT,
  marital_status TEXT,
  household_type TEXT,
  livelihood TEXT,
  themes TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Stories are publicly readable" ON public.stories FOR SELECT USING (true);
CREATE POLICY "Anyone can insert stories" ON public.stories FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update stories" ON public.stories FOR UPDATE USING (true);

CREATE INDEX idx_stories_district  ON public.stories (district);
CREATE INDEX idx_stories_scheme    ON public.stories (scheme);
CREATE INDEX idx_stories_timestamp ON public.stories (timestamp DESC);
CREATE INDEX idx_stories_validated ON public.stories (validated);
CREATE INDEX idx_stories_themes    ON public.stories USING GIN (themes);
