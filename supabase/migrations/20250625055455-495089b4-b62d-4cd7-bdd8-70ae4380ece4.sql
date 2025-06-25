
-- Supprimer les fonctions de verrouillage des leads
DROP FUNCTION IF EXISTS public.lock_lead(uuid, uuid, text);
DROP FUNCTION IF EXISTS public.unlock_lead(uuid, uuid);
DROP FUNCTION IF EXISTS public.cleanup_expired_locks();
DROP FUNCTION IF EXISTS public.cleanup_old_locks();
DROP FUNCTION IF EXISTS public.check_recent_contact(uuid);
