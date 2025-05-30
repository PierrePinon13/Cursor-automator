
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
          leadId: leadId,  // Make sure we're sending leadId
          message: message,
          userId: user.id,
          userFullName: user.user_metadata?.full_name || 'Utilisateur Inconnu'
        }
      });

      console.log('Function response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data && data.success) {
        toast({
          title: "Succès",
          description: "Message LinkedIn enregistré avec succès",
        });
        return true;
      } else {
        const errorMessage = data?.error || 'Échec de l\'envoi du message';
        
        toast({
          title: "Erreur",
          description: errorMessage,
          variant: "destructive",
        });
        
        throw new Error(errorMessage);
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
