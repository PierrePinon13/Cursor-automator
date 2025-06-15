
-- Ajoute une colonne company_id (texte) à la table job_search_results pour stocker l’identifiant unique de l’entreprise issue du payload N8N.
ALTER TABLE job_search_results ADD COLUMN company_id text;
