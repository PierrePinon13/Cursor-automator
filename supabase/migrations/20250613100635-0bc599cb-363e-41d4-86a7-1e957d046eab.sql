
-- Créer la table pour les tâches de traitement des datasets
CREATE TABLE IF NOT EXISTS public.dataset_processing_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id TEXT NOT NULL,
  total_items INTEGER NOT NULL DEFAULT 0,
  total_batches INTEGER NOT NULL DEFAULT 0,
  batches_sent INTEGER NOT NULL DEFAULT 0,
  batch_errors INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'completed_with_errors', 'failed')),
  batch_data JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  started_processing_at TIMESTAMP WITH TIME ZONE,
  last_batch_sent_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Créer un index sur dataset_id et status pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_dataset_processing_tasks_dataset_status 
ON public.dataset_processing_tasks(dataset_id, status);

-- Créer un index sur created_at pour les requêtes par date
CREATE INDEX IF NOT EXISTS idx_dataset_processing_tasks_created_at 
ON public.dataset_processing_tasks(created_at);
