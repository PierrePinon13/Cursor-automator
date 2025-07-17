-- Ajouter une contrainte CHECK pour valider les valeurs de processing_status
ALTER TABLE public.leads 
ADD CONSTRAINT leads_processing_status_check 
CHECK (processing_status IN ('pending', 'processing', 'completed', 'filtered_hr_provider', 'mistargeted', 'rejected_by_user'));

-- Créer un index pour améliorer les performances des requêtes sur processing_status
CREATE INDEX IF NOT EXISTS idx_leads_processing_status ON public.leads(processing_status);

-- Ajouter un commentaire pour documenter les valeurs possibles
COMMENT ON COLUMN public.leads.processing_status IS 'État de traitement du lead: pending (en attente), processing (en cours), completed (traité), filtered_hr_provider (filtré car cabinet RH), mistargeted (mal ciblé), rejected_by_user (rejeté par l''utilisateur)'; 