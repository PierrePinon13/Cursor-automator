
-- Ajout d’une colonne job_id pour stocker l’identifiant unique de l’offre reçue depuis N8N
ALTER TABLE public.job_search_results
ADD COLUMN job_id text;

-- Ajout d’un index unique pour éviter les doublons (une offre job_id par recherche search_id maximum)
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_search_results_unique_search_job ON public.job_search_results(search_id, job_id);
