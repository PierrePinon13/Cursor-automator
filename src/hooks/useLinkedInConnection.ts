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
    try {
      // You could add a check-linkedin-status function here
      await fetchConnections();
      toast({
        title: "Statut actualisé",
        description: "Le statut de la connexion a été vérifié.",
      });
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: "Impossible de vérifier le statut.",
        variant: "destructive",
      });
    }
  };

  return {
    connections,
    loading,
    connectLinkedIn,
    disconnectLinkedIn,
    checkStatus,
    refreshConnections: fetchConnections,
  };
}
