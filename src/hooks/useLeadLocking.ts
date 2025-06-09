
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export interface LeadLockInfo {
  isLocked: boolean;
  lockedByUserName?: string;
  lockedAt?: string;
  hoursAgo?: number;
}

interface LockLeadResponse {
  success: boolean;
  error?: string;
  locked_by_user_name?: string;
  locked_at?: string;
  message?: string;
}

interface UnlockLeadResponse {
  success: boolean;
  error?: string;
  message?: string;
}

interface RecentContactResponse {
  has_recent_contact: boolean;
  contacted_by?: string;
  hours_ago?: number;
  last_contact_at?: string;
}

export const useLeadLocking = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [lockingInProgress, setLockingInProgress] = useState(false);

  // Fonction pour nettoyer les verrous expirés (plus de 3 minutes)
  const cleanupExpiredLocks = useCallback(async () => {
    try {
      console.log('🧹 Cleaning up expired locks (older than 3 minutes)...');
      
      // Nettoyer manuellement les verrous de plus de 3 minutes
      const { data, error } = await supabase
        .from('leads')
        .update({
          locked_by_user_id: null,
          locked_by_user_name: null,
          locked_at: null,
          last_updated_at: new Date().toISOString()
        })
        .lt('locked_at', new Date(Date.now() - 3 * 60 * 1000).toISOString())
        .not('locked_by_user_id', 'is', null);
      
      if (error) {
        console.error('Error cleaning up expired locks:', error);
      } else {
        console.log(`✅ Cleaned up expired locks`);
      }
    } catch (error) {
      console.error('Error in cleanupExpiredLocks:', error);
    }
  }, []);

  // Nettoyer les verrous expirés périodiquement
  useEffect(() => {
    // Nettoyer immédiatement au chargement
    cleanupExpiredLocks();
    
    // Puis nettoyer toutes les 30 secondes
    const cleanupInterval = setInterval(cleanupExpiredLocks, 30000);
    
    return () => clearInterval(cleanupInterval);
  }, [cleanupExpiredLocks]);

  const lockLead = useCallback(async (leadId: string): Promise<LeadLockInfo> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    setLockingInProgress(true);
    try {
      // Nettoyer les verrous expirés avant de tenter le verrouillage
      await cleanupExpiredLocks();
      
      const { data, error } = await supabase.rpc('lock_lead', {
        lead_id: leadId,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || 'Utilisateur'
      });

      if (error) {
        console.error('Error locking lead:', error);
        throw new Error('Erreur lors du verrouillage du lead');
      }

      const response = data as unknown as LockLeadResponse;

      if (!response.success) {
        const lockInfo: LeadLockInfo = {
          isLocked: true,
          lockedByUserName: response.locked_by_user_name,
          lockedAt: response.locked_at
        };

        if (response.locked_at) {
          const lockedDate = new Date(response.locked_at);
          const hoursAgo = (Date.now() - lockedDate.getTime()) / (1000 * 60 * 60);
          lockInfo.hoursAgo = Math.round(hoursAgo * 10) / 10;
        }

        return lockInfo;
      }

      return { isLocked: false };
    } finally {
      setLockingInProgress(false);
    }
  }, [user, cleanupExpiredLocks]);

  const unlockLead = useCallback(async (leadId: string): Promise<boolean> => {
    if (!user) return false;

    try {
      const { data, error } = await supabase.rpc('unlock_lead', {
        lead_id: leadId,
        user_id: user.id
      });

      if (error) {
        console.error('Error unlocking lead:', error);
        return false;
      }

      const response = data as unknown as UnlockLeadResponse;
      return response.success;
    } catch (error) {
      console.error('Error unlocking lead:', error);
      return false;
    }
  }, [user]);

  const checkRecentContact = useCallback(async (leadId: string) => {
    try {
      const { data, error } = await supabase.rpc('check_recent_contact', {
        lead_id: leadId
      });

      if (error) {
        console.error('Error checking recent contact:', error);
        return { hasRecentContact: false };
      }

      const response = data as unknown as RecentContactResponse;

      return {
        hasRecentContact: response.has_recent_contact,
        contactedBy: response.contacted_by,
        hoursAgo: response.hours_ago,
        lastContactAt: response.last_contact_at
      };
    } catch (error) {
      console.error('Error checking recent contact:', error);
      return { hasRecentContact: false };
    }
  }, []);

  // Système de heartbeat pour maintenir le verrou actif (toutes les 2 minutes)
  const maintainLock = useCallback(async (leadId: string) => {
    if (!user) return;

    try {
      // Actualiser le timestamp du verrou toutes les 2 minutes (avant les 3 minutes limite)
      await supabase.rpc('lock_lead', {
        lead_id: leadId,
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email || 'Utilisateur'
      });
    } catch (error) {
      console.error('Error maintaining lock:', error);
    }
  }, [user]);

  // Setup heartbeat et cleanup pour un lead
  const setupLockMaintenance = useCallback((leadId: string) => {
    // Heartbeat toutes les 2 minutes pour maintenir le verrou (avant les 3 minutes limite)
    const heartbeatInterval = setInterval(() => {
      maintainLock(leadId);
    }, 120000); // 2 minutes

    // Cleanup function pour déverrouiller
    const cleanup = () => {
      clearInterval(heartbeatInterval);
      unlockLead(leadId);
    };
    
    // Déverrouiller lors de la fermeture de l'onglet/page
    const handleBeforeUnload = () => {
      // Envoi synchrone pour s'assurer que ça passe avant la fermeture
      navigator.sendBeacon(`/api/unlock-lead`, JSON.stringify({
        leadId,
        userId: user?.id
      }));
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cleanup();
    };
  }, [maintainLock, unlockLead, user]);

  return {
    lockLead,
    unlockLead,
    checkRecentContact,
    setupLockMaintenance,
    lockingInProgress,
    cleanupExpiredLocks
  };
};
