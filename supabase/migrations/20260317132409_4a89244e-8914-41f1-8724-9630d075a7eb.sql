
-- Store the full question schema and translations as JSON documents
-- Using a single-row "config" pattern with a key identifier
CREATE TABLE public.question_schema (
  id TEXT PRIMARY KEY DEFAULT 'default',
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Allow public read/write (matches stories table pattern - no auth)
ALTER TABLE public.question_schema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read question schema"
  ON public.question_schema FOR SELECT TO public
  USING (true);

CREATE POLICY "Anyone can insert question schema"
  ON public.question_schema FOR INSERT TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update question schema"
  ON public.question_schema FOR UPDATE TO public
  USING (true);
