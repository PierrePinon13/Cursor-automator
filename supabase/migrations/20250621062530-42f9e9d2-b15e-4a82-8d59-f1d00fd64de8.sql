
-- Créer la table pour stocker les recherches de posts LinkedIn
CREATE TABLE public.linkedin_search_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  search_type TEXT NOT NULL CHECK (search_type IN ('parameters', 'url')),
  
  -- Pour les recherches par paramètres
  group1_keywords TEXT[],
  group1_operator TEXT CHECK (group1_operator IN ('OR', 'AND')),
  group2_keywords TEXT[],
  group2_operator TEXT CHECK (group2_operator IN ('OR', 'AND')),
  
  -- Pour les recherches par URLs
  urls TEXT[],
  
  -- Configuration
  auto_scraping BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  
  -- Rotation des comptes Unipile
  last_unipile_account_used TEXT,
  
  -- Métadonnées
  created_by_user_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_executed_at TIMESTAMP WITH TIME ZONE,
  
  -- Stats d'exécution
  total_executions INTEGER NOT NULL DEFAULT 0,
  last_execution_status TEXT,
  last_execution_posts_count INTEGER
);

-- Ajouter une table pour les comptes Unipile disponibles et leur rotation
CREATE TABLE public.unipile_accounts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id TEXT NOT NULL UNIQUE,
  account_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMP WITH TIME ZONE,
  daily_usage_count INTEGER NOT NULL DEFAULT 0,
  daily_limit INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Fonction pour obtenir le prochain compte Unipile à utiliser (rotation)
CREATE OR REPLACE FUNCTION get_next_unipile_account()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_account_id TEXT;
BEGIN
  -- Sélectionner le compte actif le moins récemment utilisé
  SELECT account_id INTO next_account_id
  FROM unipile_accounts
  WHERE is_active = true
    AND (daily_usage_count < daily_limit OR date_trunc('day', last_used_at) < date_trunc('day', now()))
  ORDER BY 
    CASE WHEN date_trunc('day', last_used_at) < date_trunc('day', now()) THEN 0 ELSE daily_usage_count END,
    COALESCE(last_used_at, '1970-01-01'::timestamp) ASC
  LIMIT 1;
  
  -- Mettre à jour les statistiques d'utilisation
  IF next_account_id IS NOT NULL THEN
    UPDATE unipile_accounts 
    SET 
      last_used_at = now(),
      daily_usage_count = CASE 
        WHEN date_trunc('day', last_used_at) < date_trunc('day', now()) THEN 1
        ELSE daily_usage_count + 1
      END,
      updated_at = now()
    WHERE account_id = next_account_id;
  END IF;
  
  RETURN next_account_id;
END;
$$;

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION update_linkedin_search_configurations_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_linkedin_search_configurations_updated_at
  BEFORE UPDATE ON linkedin_search_configurations
  FOR EACH ROW
  EXECUTE FUNCTION update_linkedin_search_configurations_updated_at();

-- Trigger similaire pour unipile_accounts
CREATE OR REPLACE FUNCTION update_unipile_accounts_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_unipile_accounts_updated_at
  BEFORE UPDATE ON unipile_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_unipile_accounts_updated_at();

-- Insérer quelques comptes Unipile par défaut (à remplacer par vos vrais IDs)
INSERT INTO unipile_accounts (account_id, account_name, is_active) VALUES
('account_1', 'Compte Unipile 1', true),
('account_2', 'Compte Unipile 2', true),
('account_3', 'Compte Unipile 3', true);
