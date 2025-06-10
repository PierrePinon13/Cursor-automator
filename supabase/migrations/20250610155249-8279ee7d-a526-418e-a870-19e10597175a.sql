
-- Ajouter les colonnes manquantes pour le système de prestataires RH
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS matched_hr_provider_id uuid,
ADD COLUMN IF NOT EXISTS matched_hr_provider_name text;

-- Ajouter un index pour améliorer les performances de filtrage
CREATE INDEX IF NOT EXISTS idx_leads_processing_status ON public.leads(processing_status);
CREATE INDEX IF NOT EXISTS idx_leads_hr_provider_id ON public.leads(matched_hr_provider_id);
