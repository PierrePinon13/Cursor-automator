
-- Ajouter une contrainte unique sur search_id et company_id pour job_search_personas
-- Cela permettra d'éviter les doublons et de faire des upserts corrects
ALTER TABLE public.job_search_personas 
ADD CONSTRAINT job_search_personas_search_company_unique 
UNIQUE (search_id, company_id);

-- Si nous voulons permettre plusieurs entrées par search_id mais avec des company_id différents,
-- cette contrainte est parfaite. Si nous voulons une seule entrée par search_id,
-- nous pourrions utiliser UNIQUE (search_id) à la place.
