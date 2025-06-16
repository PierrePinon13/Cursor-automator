
-- Ajouter la colonne updated_at à job_search_results si elle n'existe pas
ALTER TABLE public.job_search_results 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

-- Ajouter la colonne company_id à job_search_personas si elle n'existe pas
ALTER TABLE public.job_search_personas 
ADD COLUMN IF NOT EXISTS company_id TEXT;

-- Créer un trigger pour mettre à jour automatiquement updated_at dans job_search_results
CREATE OR REPLACE FUNCTION update_job_search_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Appliquer le trigger sur job_search_results
DROP TRIGGER IF EXISTS update_job_search_results_updated_at_trigger ON public.job_search_results;
CREATE TRIGGER update_job_search_results_updated_at_trigger
  BEFORE UPDATE ON public.job_search_results
  FOR EACH ROW
  EXECUTE FUNCTION update_job_search_results_updated_at();

-- Forcer le rechargement du cache PostgREST pour que les nouvelles colonnes soient visibles
NOTIFY pgrst, 'reload schema';
