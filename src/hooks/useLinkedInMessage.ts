
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

    if (!message.trim()) {
      toast({
        title: "Erreur",
        description: "Le message ne peut pas être vide.",
        variant: "destructive",
      });
      return false;
    }

    setLoading(true);
    try {
      console.log('🚀 Sending LinkedIn message to lead:', leadId);
      
      const { data, error } = await supabase.functions.invoke('linkedin-message', {
        body: { 
          leadId: leadId,
          message: message.trim(),
          userId: user.id,
          userFullName: user.user_metadata?.full_name || 'Utilisateur Inconnu'
        }
      });

      console.log('📡 Function response:', { data, error });

      if (error) {
        console.error('❌ Function error:', error);
        throw error;
      }

      if (data && data.success) {
        const actionType = data.messageType === 'direct_message' ? 'Message LinkedIn' : 'Demande de connexion LinkedIn';
        const networkInfo = data.networkDistance ? ` (distance réseau: ${data.networkDistance})` : '';
        
        toast({
          title: "Succès",
          description: `${actionType} envoyé avec succès${networkInfo}`,
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
      console.error('💥 LinkedIn message error:', error);
      
      // Messages d'erreur spécifiques selon le type d'erreur
      let errorMessage = "Impossible d'envoyer le message LinkedIn.";
      
      if (error.message?.includes('No active LinkedIn connection')) {
        errorMessage = "Aucune connexion LinkedIn active trouvée. Veuillez connecter votre compte LinkedIn.";
      } else if (error.message?.includes('Lead not found')) {
        errorMessage = "Lead introuvable. Veuillez réessayer.";
      } else if (error.message?.includes('Failed to scrape profile')) {
        errorMessage = "Impossible d'analyser le profil LinkedIn. Veuillez réessayer plus tard.";
      } else if (error.message?.includes('Failed to send_message') || error.message?.includes('Failed to send_invitation')) {
        errorMessage = "Échec de l'envoi via LinkedIn. Veuillez réessayer plus tard.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Erreur",
        description: errorMessage,
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
