
-- Créer la table companies_enrichment pour stocker les données enrichies
CREATE TABLE IF NOT EXISTS public.companies_enrichment (
  linkedin_id TEXT PRIMARY KEY,
  name TEXT,
  description TEXT,
  activities TEXT,
  employee_count TEXT,
  categorie TEXT,
  enriched_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ajouter des politiques RLS pour la sécurité
ALTER TABLE public.companies_enrichment ENABLE ROW LEVEL SECURITY;

-- Politique pour permettre la lecture à tous les utilisateurs authentifiés
CREATE POLICY "Allow read access to authenticated users" 
ON public.companies_enrichment 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Politique pour permettre l'insertion via les edge functions
CREATE POLICY "Allow insert from service role" 
ON public.companies_enrichment 
FOR INSERT 
WITH CHECK (true);

-- Politique pour permettre la mise à jour via les edge functions
CREATE POLICY "Allow update from service role" 
ON public.companies_enrichment 
FOR UPDATE 
USING (true);
