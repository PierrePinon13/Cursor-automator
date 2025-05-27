
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

export function usePhoneRetrieval() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const retrievePhone = async (leadId: string) => {
    setLoading(true);
    try {
      console.log('Retrieving phone for lead:', leadId);
      
      const { data, error } = await supabase.functions.invoke('datagma-phone', {
        body: { lead_id: leadId }
      });

      console.log('Phone retrieval response:', { data, error });

      if (error) {
        console.error('Function error:', error);
        throw error;
      }

      if (data && data.success) {
        // Vérifier d'abord s'il y a une erreur Datagma
        if (data.datagma_error) {
          toast({
            title: "Erreur Datagma",
            description: data.datagma_error,
            variant: "destructive",
          });
          return null;
        } else if (data.phone_number) {
          // Numéro trouvé avec succès
          toast({
            title: "Téléphone récupéré",
            description: `Numéro trouvé : ${data.phone_number}${data.cached ? ' (en cache)' : ''}`,
          });
          return data.phone_number;
        } else {
          // Cas où aucun numéro n'a été trouvé - ce n'est pas une erreur
          toast({
            title: "Aucun téléphone trouvé",
            description: "Aucun numéro de téléphone n'a été trouvé pour ce contact.",
            variant: "default",
          });
          return null;
        }
      } else {
        throw new Error(data?.error || 'Échec de la récupération du téléphone');
      }
    } catch (error: any) {
      console.error('Phone retrieval error:', error);
      toast({
        title: "Erreur",
        description: error.message || "Impossible de récupérer le numéro de téléphone.",
        variant: "destructive",
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    retrievePhone,
    loading,
  };
}
