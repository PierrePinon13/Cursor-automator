
-- Créer la fonction cleanup_expired_locks pour nettoyer les verrous expirés (plus de 3 minutes)
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    cleaned_count integer;
BEGIN
    UPDATE public.leads
    SET 
        locked_by_user_id = NULL,
        locked_by_user_name = NULL,
        locked_at = NULL,
        last_updated_at = now()
    WHERE locked_at < now() - interval '3 minutes'
      AND locked_by_user_id IS NOT NULL;
    
    GET DIAGNOSTICS cleaned_count = ROW_COUNT;
    
    RETURN cleaned_count;
END;
$function$
