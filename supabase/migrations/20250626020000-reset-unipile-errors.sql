-- Reset les posts en erreur pour les retraiter
UPDATE linkedin_posts
SET processing_status = 'queued_unipile',
    retry_count = 0,
    last_retry_at = NULL,
    error_message = NULL,
    last_updated_at = NOW()
WHERE processing_status IN ('error', 'error_unipile')
  AND (retry_count IS NULL OR retry_count < 3); 