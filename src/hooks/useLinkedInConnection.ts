
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface LinkedInConnection {
  id: string;
  user_id: string;
  unipile_account_id: string;
  account_id: string | null;
  status: string;
  account_type: string | null;
  linkedin_profile_url: string | null;
  connection_status: string;
  error_message: string | null;
  last_update: string | null;
  connected_at: string | null;
  updated_at: string;
  created_at: string;
}

export function useLinkedInConnection() {
  const [connections, setConnections] = useState<LinkedInConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchConnections();
    }
  }, [user]);

  const fetchConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('linkedin_connections')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setConnections(data || []);
    } catch (error: any) {
      console.error('Error fetching LinkedIn connections:', error);
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
        await fetchConnections();
        toast({
          title: "Synchronisation réussie",
          description: `${data.accounts_processed} compte(s) LinkedIn synchronisé(s)`,
        });
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      toast({
        title: "Erreur de synchronisation",
        description: error.message || "Impossible de synchroniser les comptes LinkedIn.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  const connectLinkedIn = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('Calling linkedin-connect function...');
      
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

        // Poll for connection success
        const pollConnection = () => {
          const checkInterval = setInterval(async () => {
            if (popup.closed) {
              clearInterval(checkInterval);
              await fetchConnections();
              return;
            }

            // Check if connection is now successful
            await fetchConnections();
          }, 2000);

          // Stop polling after 5 minutes
          setTimeout(() => {
            clearInterval(checkInterval);
          }, 300000);
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

  const disconnectLinkedIn = async (connectionId: string) => {
    try {
      const { error } = await supabase
        .from('linkedin_connections')
        .delete()
        .eq('id', connectionId);

      if (error) throw error;

      await fetchConnections();
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

  const checkStatus = async (accountId: string) => {
    if (!accountId) {
      toast({
        title: "Erreur",
        description: "ID de compte manquant pour vérifier le statut.",
        variant: "destructive",
      });
      return;
    }

    setCheckingStatus(true);
    try {
      console.log('Checking LinkedIn status using sync accounts for account:', accountId);
      
      // Utilise la fonction de synchronisation complète au lieu de l'endpoint individuel
      const { data, error } = await supabase.functions.invoke('linkedin-sync-accounts');

      if (error) {
        console.error('Sync error during status check:', error);
        throw error;
      }

      console.log('Sync response during status check:', data);

      if (data && data.success) {
        await fetchConnections();
        
        // Chercher les informations spécifiques du compte demandé dans les résultats
        const accountResult = data.results?.find((result: any) => 
          result.account_id === accountId && result.status !== 'error'
        );

        if (accountResult) {
          const statusMessages = {
            'connected': 'Compte LinkedIn connecté et fonctionnel',
            'pending': 'Connexion en cours, veuillez patienter...',
            'credentials_required': 'Identifiants LinkedIn à renouveler',
            'validation_required': 'Validation requise dans l\'application LinkedIn',
            'checkpoint_required': 'Action requise (vérification 2FA)',
            'captcha_required': 'Résolution de captcha nécessaire',
            'disconnected': 'Compte LinkedIn déconnecté',
            'unknown': 'Statut inconnu'
          };

          const accountData = accountResult.data;
          const status = accountData?.status || 'unknown';
          const message = statusMessages[status as keyof typeof statusMessages] || 'Statut vérifié via synchronisation complète';
          
          toast({
            title: "Statut vérifié",
            description: `${message} (Account ID: ${accountId})`,
            variant: status === 'connected' ? 'default' : (status === 'pending' ? 'default' : 'destructive'),
          });
        } else {
          toast({
            title: "Compte introuvable",
            description: `Le compte ${accountId} n'a pas été trouvé dans la synchronisation Unipile`,
            variant: "destructive",
          });
        }
      } else {
        throw new Error('Réponse invalide du serveur');
      }
    } catch (error: any) {
      console.error('Status check via sync failed:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de vérifier le statut du compte via la synchronisation.",
        variant: "destructive",
      });
    } finally {
      setCheckingStatus(false);
    }
  };

  return {
    connections,
    loading,
    checkingStatus,
    syncing,
    connectLinkedIn,
    disconnectLinkedIn,
    checkStatus,
    syncAccounts,
    refreshConnections: fetchConnections,
  };
}
