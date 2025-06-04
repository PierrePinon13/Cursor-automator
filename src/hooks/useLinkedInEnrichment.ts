
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { extractLinkedInPublicIdentifier } from '@/utils/linkedinUtils';

export const useLinkedInEnrichment = () => {
  const [loading, setLoading] = useState<string | null>(null);
  const { toast } = useToast();

  const enrichEntity = async (
    entityId: string,
    entityType: 'client' | 'hr_provider',
    linkedinUrl: string
  ) => {
    setLoading(entityId);

    try {
      const publicIdentifier = extractLinkedInPublicIdentifier(linkedinUrl);
      
      if (!publicIdentifier) {
        toast({
          title: "Erreur",
          description: "Impossible d'extraire l'identifiant de l'URL LinkedIn.",
          variant: "destructive",
        });
        return false;
      }

      console.log('🔍 Enriching entity:', { entityId, entityType, linkedinUrl, publicIdentifier });

      const { data, error } = await supabase.functions.invoke('enrich-company-linkedin', {
        body: {
          linkedinUrl,
          publicIdentifier,
          entityType,
          entityId
        }
      });

      if (error) {
        console.error('❌ Enrichment error:', error);
        toast({
          title: "Erreur",
          description: "Erreur lors de l'enrichissement via Unipile.",
          variant: "destructive",
        });
        return false;
      }

      if (!data.success) {
        console.error('❌ Enrichment failed:', data.error);
        toast({
          title: "Erreur",
          description: data.error || "Échec de l'enrichissement.",
          variant: "destructive",
        });
        return false;
      }

      toast({
        title: "Succès",
        description: `LinkedIn ID enrichi: ${data.linkedinId}`,
      });

      return true;

    } catch (error) {
      console.error('💥 Enrichment error:', error);
      toast({
        title: "Erreur",
        description: "Erreur inattendue lors de l'enrichissement.",
        variant: "destructive",
      });
      return false;
    } finally {
      setLoading(null);
    }
  };

  return {
    enrichEntity,
    loading
  };
};
