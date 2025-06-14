
-- Création de la table pour les recherches de jobs sauvegardées
CREATE TABLE IF NOT EXISTS saved_job_searches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  job_filters jsonb NOT NULL,
  persona_filters jsonb NOT NULL,
  message_template text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  last_executed_at timestamp with time zone,
  results_count integer DEFAULT 0
);

-- Création de la table pour les résultats de recherche
CREATE TABLE IF NOT EXISTS job_search_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  search_id uuid NOT NULL REFERENCES saved_job_searches(id) ON DELETE CASCADE,
  job_title text NOT NULL,
  company_name text NOT NULL,
  location text,
  posted_date timestamp with time zone,
  job_description text,
  job_url text,
  personas jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_saved_job_searches_user_id ON saved_job_searches(user_id);
CREATE INDEX IF NOT EXISTS idx_job_search_results_search_id ON job_search_results(search_id);

-- Trigger pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_saved_job_searches_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_update_saved_job_searches_updated_at
  BEFORE UPDATE ON saved_job_searches
  FOR EACH ROW
  EXECUTE FUNCTION update_saved_job_searches_updated_at();
