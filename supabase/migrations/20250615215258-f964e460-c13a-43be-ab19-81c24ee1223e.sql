
-- Ajout d’une colonne pour indiquer si la recherche de personas a déjà été faite pour une job offer dans une recherche

ALTER TABLE public.job_search_results
ADD COLUMN IF NOT EXISTS personnas_searched boolean NOT NULL DEFAULT false;

-- (optionally, un index pour la rapidité des filtres si besoin)
CREATE INDEX IF NOT EXISTS idx_job_search_results_personnas_searched ON public.job_search_results(personnas_searched);
