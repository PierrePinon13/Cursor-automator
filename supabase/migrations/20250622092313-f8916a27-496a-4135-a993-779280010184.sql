
-- Modifier la table unipile_accounts pour gérer les recherches en cours
ALTER TABLE public.unipile_accounts 
ADD COLUMN current_search_id UUID,
ADD COLUMN search_started_at TIMESTAMP WITH TIME ZONE;

-- Supprimer les comptes de test et permettre l'insertion de vrais comptes
DELETE FROM public.unipile_accounts WHERE account_id LIKE 'account_%';

-- Modifier la fonction pour gérer les comptes en cours d'utilisation
CREATE OR REPLACE FUNCTION get_next_unipile_account()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_account_id TEXT;
BEGIN
  -- Libérer les comptes bloqués depuis plus d'1 heure
  UPDATE unipile_accounts 
  SET 
    current_search_id = NULL,
    search_started_at = NULL,
    updated_at = now()
  WHERE current_search_id IS NOT NULL 
    AND search_started_at < now() - interval '1 hour';
  
  -- Sélectionner le compte actif disponible le moins récemment utilisé
  SELECT account_id INTO next_account_id
  FROM unipile_accounts
  WHERE is_active = true
    AND current_search_id IS NULL
    AND (daily_usage_count < daily_limit OR date_trunc('day', last_used_at) < date_trunc('day', now()))
  ORDER BY 
    CASE WHEN date_trunc('day', last_used_at) < date_trunc('day', now()) THEN 0 ELSE daily_usage_count END,
    COALESCE(last_used_at, '1970-01-01'::timestamp) ASC
  LIMIT 1;
  
  RETURN next_account_id;
END;
$$;

-- Fonction pour marquer un compte comme en cours d'utilisation
CREATE OR REPLACE FUNCTION reserve_unipile_account(account_id_param TEXT, search_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE unipile_accounts 
  SET 
    current_search_id = search_id_param,
    search_started_at = now(),
    last_used_at = now(),
    daily_usage_count = CASE 
      WHEN date_trunc('day', last_used_at) < date_trunc('day', now()) THEN 1
      ELSE daily_usage_count + 1
    END,
    updated_at = now()
  WHERE account_id = account_id_param 
    AND current_search_id IS NULL;
  
  RETURN FOUND;
END;
$$;

-- Fonction pour libérer un compte Unipile
CREATE OR REPLACE FUNCTION release_unipile_account(search_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE unipile_accounts 
  SET 
    current_search_id = NULL,
    search_started_at = NULL,
    updated_at = now()
  WHERE current_search_id = search_id_param;
  
  RETURN FOUND;
END;
$$;
