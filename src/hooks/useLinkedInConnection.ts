
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface LinkedInConnection {
  id: string;
  unipile_account_id: string;
  linkedin_profile_url: string | null;
  connection_status: string;
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
    try {
      const { data, error } = await supabase
        .from('linkedin_connections')
        .select('*')
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
      // Call our edge function to get the hosted auth link from Unipile
      const { data, error } = await supabase.functions.invoke('linkedin-connect', {
        body: { user_id: user.id }
      });

      if (error) throw error;

      if (data.link) {
        // Open Unipile hosted auth link in new window
        window.open(data.link, '_blank', 'width=600,height=700');
        
        toast({
          title: "Connexion LinkedIn",
          description: "Une nouvelle fenêtre s'est ouverte pour connecter votre compte LinkedIn.",
        });

        // Refresh connections after a short delay to catch any updates
        setTimeout(() => {
          fetchConnections();
        }, 3000);
      }
    } catch (error: any) {
      console.error('LinkedIn connection error:', error);
      toast({
        title: "Erreur",
        description: "Impossible de se connecter à LinkedIn. Veuillez réessayer.",
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

  return {
    connections,
    loading,
    connectLinkedIn,
    disconnectLinkedIn,
    refreshConnections: fetchConnections,
  };
}
