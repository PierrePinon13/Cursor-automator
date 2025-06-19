
-- Ajouter les nouveaux champs à la table companies
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS industry TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS logo TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS categorie TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS activities TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS employee_count TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS last_enriched_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enrichment_status TEXT DEFAULT 'pending';
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS enrichment_source TEXT;

-- Migrer les données existantes de companies_enrichment vers companies
UPDATE public.companies 
SET 
  name = COALESCE(ce.name, companies.name),
  description = COALESCE(ce.description, companies.description),
  activities = ce.activities,
  employee_count = ce.employee_count,
  categorie = ce.categorie,
  last_enriched_at = ce.enriched_at,
  enrichment_status = 'enriched'
FROM public.companies_enrichment ce
WHERE companies.linkedin_id = ce.linkedin_id;

-- Créer une table pour suivre les enrichissements en cours
CREATE TABLE IF NOT EXISTS public.company_enrichment_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_id TEXT NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'error')),
  source TEXT NOT NULL CHECK (source IN ('post', 'job', 'manual')),
  account_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- Index pour optimiser les requêtes
CREATE INDEX IF NOT EXISTS idx_company_enrichment_queue_status ON public.company_enrichment_queue(status);
CREATE INDEX IF NOT EXISTS idx_company_enrichment_queue_linkedin_id ON public.company_enrichment_queue(linkedin_id);
CREATE INDEX IF NOT EXISTS idx_companies_enrichment_status ON public.companies(enrichment_status);
CREATE INDEX IF NOT EXISTS idx_companies_last_enriched_at ON public.companies(last_enriched_at);

-- Politiques RLS pour la nouvelle table
ALTER TABLE public.company_enrichment_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to authenticated users" 
ON public.company_enrichment_queue 
FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Allow all operations from service role" 
ON public.company_enrichment_queue 
FOR ALL 
USING (true);

-- Fonction pour nettoyer les anciennes entrées de la queue
CREATE OR REPLACE FUNCTION cleanup_enrichment_queue()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Supprimer les entrées complétées ou en erreur de plus de 7 jours
  DELETE FROM public.company_enrichment_queue
  WHERE status IN ('completed', 'error') 
    AND updated_at < now() - interval '7 days';
END;
$$;
