-- Ajouter la colonne rejected_at à la table linkedin_posts
ALTER TABLE public.linkedin_posts
ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Ajouter un index pour améliorer les performances des requêtes sur rejected_at
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_rejected_at ON public.linkedin_posts(rejected_at);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.linkedin_posts.rejected_at IS 'Timestamp indiquant quand le post a été rejeté. NULL signifie que le post n''a pas été rejeté.'; 