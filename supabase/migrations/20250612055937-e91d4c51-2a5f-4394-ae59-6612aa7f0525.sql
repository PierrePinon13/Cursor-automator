
-- Ajouter les colonnes manquantes dans la table leads pour les prestataires RH
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS matched_hr_provider_id uuid REFERENCES public.hr_providers(id),
ADD COLUMN IF NOT EXISTS matched_hr_provider_name text;

-- Créer un index pour améliorer les performances des requêtes
CREATE INDEX IF NOT EXISTS idx_leads_hr_provider ON public.leads(matched_hr_provider_id);
