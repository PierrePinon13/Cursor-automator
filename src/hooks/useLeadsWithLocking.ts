
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables } from '@/integrations/supabase/types';

type Lead = Tables<'leads'>;

export const useLeadsWithLocking = () => {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUnlockedLeads = useCallback(async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Récupérer les leads non verrouillés ou verrouillés par l'utilisateur actuel
      const { data: leadsData, error } = await supabase
        .from('leads')
        .select('*')
        .or(`locked_by_user_id.is.null,locked_by_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching unlocked leads:', error);
        throw error;
      }

      setLeads(leadsData || []);
    } catch (error) {
      console.error('Error in fetchUnlockedLeads:', error);
      setLeads([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Nettoyer les anciens verrous périodiquement
  const cleanupOldLocks = useCallback(async () => {
    try {
      await supabase.rpc('cleanup_old_locks');
    } catch (error) {
      console.error('Error cleaning up old locks:', error);
    }
  }, []);

  useEffect(() => {
    fetchUnlockedLeads();

    // Rafraîchir la liste toutes les 10 secondes
    const refreshInterval = setInterval(fetchUnlockedLeads, 10000);

    // Nettoyer les anciens verrous toutes les 5 minutes
    const cleanupInterval = setInterval(cleanupOldLocks, 5 * 60 * 1000);

    return () => {
      clearInterval(refreshInterval);
      clearInterval(cleanupInterval);
    };
  }, [fetchUnlockedLeads, cleanupOldLocks]);

  return {
    leads,
    loading,
    refreshLeads: fetchUnlockedLeads
  };
};
