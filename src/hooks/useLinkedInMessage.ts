
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

export function useLinkedInMessage() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const sendMessage = async (leadId: string, message: string) => {
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
      console.log('Sending LinkedIn message to lead:', leadId);
      
      const { data, error } = await supabase.functions.invoke('linkedin-message', {
        body: { 
          lead_id: leadId,
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
          description: `${actionText} à ${data.lead_name || 'le contact'} (${data.connection_degree} degré)`,
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
