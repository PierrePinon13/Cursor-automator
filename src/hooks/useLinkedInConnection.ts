
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useLinkedInConnection() {
  const [unipileAccountId, setUnipileAccountId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      console.log('User authenticated, fetching Unipile account ID...');
      fetchUnipileAccountId();
    } else {
      console.log('No user authenticated, clearing account ID');
      setUnipileAccountId(null);
    }
  }, [user]);

  const fetchUnipileAccountId = async () => {
    if (!user) {
      console.log('No user for fetchUnipileAccountId');
      return;
    }

    try {
      console.log('Fetching Unipile account ID for user:', user.id);
      const { data, error } = await supabase
        .from('profiles')
        .select('unipile_account_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching Unipile account ID:', error);
        throw error;
      }
      
      console.log('Unipile account ID fetched:', data?.unipile_account_id);
      setUnipileAccountId(data?.unipile_account_id || null);
    } catch (error: any) {
      console.error('Error fetching Unipile account ID:', error);
      toast({
        title: "Erreur",
        description: "Impossible de récupérer l'ID du compte Unipile.",
        variant: "destructive",
      });
    }
  };

  const connectLinkedIn = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Calling linkedin-connect function for user:', user.id, 'email:', user.email);
      
      // Call our edge function to initiate the hosted auth flow
      const { data, error } = await supabase.functions.invoke('linkedin-connect', {
        body: { user_id: user.id }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data && data.link) {
        console.log('Opening popup with URL:', data.link);
        
        // Open Unipile hosted auth link in new window
        const popup = window.open(
          data.link, 
          'linkedin-auth', 
          'width=600,height=700,scrollbars=yes,resizable=yes'
        );
        
        if (!popup) {
          toast({
            title: "Popup bloqué",
            description: "Veuillez autoriser les popups pour ce site et réessayer.",
            variant: "destructive",
          });
          return;
        }

        toast({
          title: "Connexion LinkedIn",
          description: "Une nouvelle fenêtre s'est ouverte pour connecter votre compte LinkedIn.",
        });

        // Enhanced polling for connection success
        const pollConnection = () => {
          let checkCount = 0;
          const maxChecks = 200; // 10 minutes max (200 * 3 seconds)
          
          const checkInterval = setInterval(async () => {
            checkCount++;
            
            if (popup.closed) {
              clearInterval(checkInterval);
              console.log('Popup closed, checking for connection update...');
              
              // Wait a moment for webhook to process, then check multiple times
              setTimeout(async () => {
                for (let i = 0; i < 5; i++) {
                  await fetchUnipileAccountId();
                  await new Promise(resolve => setTimeout(resolve, 2000));
                }
              }, 2000);
              return;
            }

            // Stop polling after max attempts
            if (checkCount >= maxChecks) {
              clearInterval(checkInterval);
              console.log('Stopped polling for LinkedIn connection - timeout');
              return;
            }

            // Check if connection is now successful
            try {
              const { data: currentProfile } = await supabase
                .from('profiles')
                .select('unipile_account_id')
                .eq('id', user.id)
                .single();

              if (currentProfile?.unipile_account_id && currentProfile.unipile_account_id !== unipileAccountId) {
                console.log('New connection detected:', currentProfile.unipile_account_id);
                setUnipileAccountId(currentProfile.unipile_account_id);
                clearInterval(checkInterval);
                popup.close();
                
                toast({
                  title: "Connexion réussie",
                  description: "Votre compte LinkedIn a été connecté avec succès.",
                });
              }
            } catch (error) {
              console.log('Error during polling check:', error);
            }
          }, 3000); // Check every 3 seconds
        };

        pollConnection();
      } else {
        throw new Error('No link received from the server');
      }
    } catch (error: any) {
      console.error('LinkedIn connection error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de se connecter à LinkedIn. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const disconnectLinkedIn = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ unipile_account_id: null })
        .eq('id', user.id);

      if (error) throw error;

      setUnipileAccountId(null);
      toast({
        title: "Déconnexion réussie",
        description: "Votre compte LinkedIn a été déconnecté.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de déconnecter le compte LinkedIn.",
        variant: "destructive",
      });
    }
  };

  const syncAccounts = async () => {
    if (!user) return;

    setSyncing(true);
    try {
      console.log('Calling linkedin-sync-accounts function...');
      
      const { data, error } = await supabase.functions.invoke('linkedin-sync-accounts');

      console.log('Sync response:', { data, error });

      if (error) {
        console.error('Sync error:', error);
        throw error;
      }

      if (data && data.success) {
        // Force refresh after sync
        await fetchUnipileAccountId();
        toast({
          title: "Synchronisation réussie",
          description: data.message || "Compte LinkedIn synchronisé avec succès",
        });
      } else {
        throw new Error(data?.error || 'Réponse invalide du serveur');
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: "Erreur de synchronisation",
        description: error.message || "Impossible de synchroniser le compte LinkedIn.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  // Force refresh function for manual testing
  const forceRefresh = async () => {
    console.log('Force refreshing connection status...');
    await fetchUnipileAccountId();
  };

  return {
    unipileAccountId,
    isConnected: !!unipileAccountId,
    loading,
    syncing,
    connectLinkedIn,
    disconnectLinkedIn,
    syncAccounts,
    refreshConnection: fetchUnipileAccountId,
    forceRefresh,
  };
}
