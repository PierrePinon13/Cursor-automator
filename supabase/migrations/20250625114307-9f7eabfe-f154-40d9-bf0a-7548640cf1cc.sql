
-- Créer une table pour stocker les sélections de personas dans les sessions de prospection
CREATE TABLE public.persona_selections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  persona_id TEXT NOT NULL,
  search_id TEXT NOT NULL,
  job_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('selected', 'removed', 'duplicate_validated')),
  selected_job_id TEXT, -- Pour les doublons validés, stocke l'ID de l'offre choisie
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Contrainte unique pour éviter les doublons
  UNIQUE(persona_id, search_id)
);

-- Index pour améliorer les performances de recherche
CREATE INDEX idx_persona_selections_search_id ON public.persona_selections(search_id);
CREATE INDEX idx_persona_selections_persona_id ON public.persona_selections(persona_id);
CREATE INDEX idx_persona_selections_status ON public.persona_selections(status);

-- Trigger pour mettre à jour automatiquement updated_at
CREATE OR REPLACE FUNCTION update_persona_selections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_persona_selections_updated_at
  BEFORE UPDATE ON public.persona_selections
  FOR EACH ROW
  EXECUTE FUNCTION update_persona_selections_updated_at();
