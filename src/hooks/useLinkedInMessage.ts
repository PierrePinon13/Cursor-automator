
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
        // Handle enhanced error responses
        const errorType = data?.error_type || 'unknown';
        const userMessage = data?.user_message || data?.error || 'Échec de l\'envoi du message';
        
        // Show specific toast based on error type
        let toastTitle = "Erreur";
        let toastDescription = userMessage;
        
        switch (errorType) {
          case 'provider_unavailable':
            toastTitle = "Service temporairement indisponible";
            toastDescription = "LinkedIn est temporairement indisponible. Nous réessayerons automatiquement.";
            break;
          case 'authentication':
            toastTitle = "Problème d'authentification";
            toastDescription = "Veuillez reconnecter votre compte LinkedIn dans les paramètres.";
            break;
          case 'rate_limit':
            toastTitle = "Limite de fréquence atteinte";
            toastDescription = "Trop de messages envoyés. Veuillez patienter quelques minutes.";
            break;
          case 'no_connection':
            toastTitle = "Connexion LinkedIn requise";
            toastDescription = "Veuillez connecter votre compte LinkedIn pour envoyer des messages.";
            break;
          case 'invalid_profile':
            toastTitle = "Profil LinkedIn invalide";
            toastDescription = "Impossible d'identifier le profil LinkedIn de ce contact.";
            break;
        }
        
        toast({
          title: toastTitle,
          description: toastDescription,
          variant: "destructive",
        });
        
        throw new Error(userMessage);
      }
    } catch (error: any) {
      console.error('LinkedIn message error:', error);
      
      // If we haven't already shown a toast, show a generic error
      if (!error.message || (!error.message.includes('LinkedIn est temporairement') && 
                             !error.message.includes('Erreur d\'authentification') &&
                             !error.message.includes('Trop de demandes'))) {
        toast({
          title: "Erreur",
          description: error.message || "Impossible d'envoyer le message LinkedIn.",
          variant: "destructive",
        });
      }
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
