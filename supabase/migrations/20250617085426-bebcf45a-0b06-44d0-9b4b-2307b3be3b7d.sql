
-- Ajouter une colonne pour distinguer la source des leads
ALTER TABLE public.leads 
ADD COLUMN lead_source TEXT DEFAULT 'linkedin_post';

-- Ajouter un commentaire pour clarifier les valeurs possibles
COMMENT ON COLUMN public.leads.lead_source IS 'Source du lead: linkedin_post (posts LinkedIn analysés par OpenAI), job_search (contacts trouvés via recherche d''emploi)';

-- Mettre à jour les leads existants pour qu'ils soient marqués comme venant de posts LinkedIn
UPDATE public.leads 
SET lead_source = 'linkedin_post' 
WHERE lead_source IS NULL;

-- Rendre la colonne non-nullable maintenant qu'elle est remplie
ALTER TABLE public.leads 
ALTER COLUMN lead_source SET NOT NULL;
