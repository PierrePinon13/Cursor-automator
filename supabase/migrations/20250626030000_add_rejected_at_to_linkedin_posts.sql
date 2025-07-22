-- Ajouter la colonne rejected_at à la table linkedin_posts
ALTER TABLE public.linkedin_posts
ADD COLUMN rejected_at TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Ajouter un index pour améliorer les performances des requêtes sur rejected_at
CREATE INDEX IF NOT EXISTS idx_linkedin_posts_rejected_at ON public.linkedin_posts(rejected_at);

-- Commentaire pour documenter la colonne
COMMENT ON COLUMN public.linkedin_posts.rejected_at IS 'Timestamp indiquant quand le post a été rejeté. NULL signifie que le post n''a pas été rejeté.'; 

-- Correction de la fonction increment_linkedin_messages pour inclure stat_date
CREATE OR REPLACE FUNCTION public.increment_linkedin_messages(user_uuid uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  INSERT INTO public.user_stats (user_id, stat_date, linkedin_messages_sent)
  VALUES (user_uuid, CURRENT_DATE, 1)
  ON CONFLICT (user_id, stat_date)
  DO UPDATE SET 
    linkedin_messages_sent = user_stats.linkedin_messages_sent + 1,
    updated_at = now();
END;
$function$; 