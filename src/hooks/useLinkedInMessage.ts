
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useLinkedInMessage() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const sendMessage = async (leadProfileId: string, message: string) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour envoyer un message.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      // Clean the profile ID to extract just the username
      let profileId = leadProfileId;
      
      // If it's a full URL, extract the username
      if (profileId.includes('/in/')) {
        const match = profileId.match(/\/in\/([^\/\?]+)/);
        if (match) {
          profileId = match[1];
        }
      }
      
      // Remove any query parameters
      if (profileId.includes('?')) {
        profileId = profileId.split('?')[0];
      }

      console.log('Sending LinkedIn message to profile:', profileId);
      console.log('Original profile URL/ID:', leadProfileId);
      
      const { data, error } = await supabase.functions.invoke('linkedin-message', {
        body: { 
          lead_profile_id: profileId,
          message: message
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data && data.success) {
        const actionText = data.action_taken === 'direct_message' 
          ? 'Message envoyé directement'
          : 'Demande de connexion envoyée avec message';
        
        toast({
          title: "Succès",
          description: `${actionText} (Contact ${data.connection_degree} degré)`,
        });
        return true;
      } else {
        throw new Error(data?.error || 'Échec de l\'envoi du message');
      }
    } catch (error: any) {
      console.error('LinkedIn message error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible d'envoyer le message LinkedIn.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    sendMessage,
    loading,
  };
}
