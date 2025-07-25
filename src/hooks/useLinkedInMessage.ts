
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLeadInteractions } from './useLeadInteractions';
import { useLinkedInDailyLimit } from './useLinkedInDailyLimit';

export function useLinkedInMessage() {
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { showSuccessToast } = useLeadInteractions();
  const { isAtLimit, incrementCount, dailyCount, DAILY_LINKEDIN_LIMIT } = useLinkedInDailyLimit();

  const sendMessage = async (leadId: string, message: string, leadData?: { author_name?: string; author_profile_url?: string }) => {
    if (!user) {
      showSuccessToast("Vous devez être connecté pour envoyer un message.");
      return false;
    }

    if (!message.trim()) {
      showSuccessToast("Le message ne peut pas être vide.");
      return false;
    }

    // Vérifier la limite quotidienne
    if (isAtLimit) {
      showSuccessToast(
        `🎉 Félicitations ! Vous avez atteint votre objectif quotidien de ${DAILY_LINKEDIN_LIMIT} messages LinkedIn. Excellente implication ! À demain pour continuer ! 💪`
      );
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
        // Incrémenter le compteur local immédiatement
        incrementCount();
        
        const actionType = data.messageType === 'direct_message' ? 'Message LinkedIn envoyé' : 'Demande de connexion LinkedIn envoyée';
        const networkInfo = data.networkDistance ? ` (distance réseau: ${data.networkDistance})` : '';
        
        // Message de succès avec info sur le compteur
        const remainingMessages = Math.max(0, DAILY_LINKEDIN_LIMIT - (dailyCount + 1));
        const successMessage = remainingMessages > 0 
          ? `${actionType} avec succès${networkInfo} (${remainingMessages} messages restants aujourd'hui)`
          : `${actionType} avec succès${networkInfo} 🎉 Objectif quotidien atteint !`;
        
        showSuccessToast(
          successMessage,
          leadData?.author_profile_url,
          leadData?.author_name
        );
        return true;
      } else {
        const errorMessage = data?.error || 'Échec de l\'envoi du message';
        showSuccessToast(errorMessage);
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
      
      showSuccessToast(errorMessage);
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
