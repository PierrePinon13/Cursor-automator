
-- Création d’une table centralisée pour stocker les personas d’une recherche job (liée par search_id)
CREATE TABLE IF NOT EXISTS public.job_search_personas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id UUID NOT NULL,
  personas JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- états : pending/loaded/error
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index pour accélérer les recherches par search_id
CREATE INDEX IF NOT EXISTS idx_job_search_personas_search_id ON public.job_search_personas(search_id);

-- RLS pour permettre uniquement au propriétaire de la recherche de lire/écrire
ALTER TABLE public.job_search_personas ENABLE ROW LEVEL SECURITY;

-- Autoriser l’utilisateur propriétaire à SELECT
CREATE POLICY "Users can view personas of their job search"
  ON public.job_search_personas
  FOR SELECT
  USING (
    search_id IN (
      SELECT id FROM public.saved_job_searches WHERE user_id = auth.uid()
    )
  );

-- Autoriser l’utilisateur propriétaire à insérer des personas
CREATE POLICY "Users can insert personas for their job search"
  ON public.job_search_personas
  FOR INSERT
  WITH CHECK (
    search_id IN (
      SELECT id FROM public.saved_job_searches WHERE user_id = auth.uid()
    )
  );

-- Autoriser l’utilisateur propriétaire à UPDATE (pour actualiser personas/état)
CREATE POLICY "Users can update personas for their job search"
  ON public.job_search_personas
  FOR UPDATE
  USING (
    search_id IN (
      SELECT id FROM public.saved_job_searches WHERE user_id = auth.uid()
    )
  );

-- Autoriser l’utilisateur propriétaire à DELETE (facultatif)
CREATE POLICY "Users can delete personas for their job search"
  ON public.job_search_personas
  FOR DELETE
  USING (
    search_id IN (
      SELECT id FROM public.saved_job_searches WHERE user_id = auth.uid()
    )
  );
