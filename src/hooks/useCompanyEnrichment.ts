
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useCompanyEnrichment() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const enrichCompany = async (companyLinkedInId: string) => {
    if (!companyLinkedInId) {
      toast({
        title: "Erreur",
        description: "LinkedIn ID manquant pour l'entreprise",
        variant: "destructive"
      });
      return null;
    }

    setLoading(true);
    
    try {
      console.log('🏢 Starting company enrichment for:', companyLinkedInId);
      
      const { data, error } = await supabase.functions.invoke('enrich-company', {
        body: { companyLinkedInId }
      });

      if (error) {
        console.error('❌ Error calling enrich-company function:', error);
        toast({
          title: "Erreur d'enrichissement",
          description: "Impossible d'enrichir l'entreprise. Veuillez réessayer.",
          variant: "destructive"
        });
        return null;
      }

      if (data?.success) {
        if (data.cached) {
          toast({
            title: "Données récupérées",
            description: "Les données d'enrichissement étaient déjà en cache",
          });
        } else if (data.status === 'pending') {
          toast({
            title: "Enrichissement en cours",
            description: "Le processus d'enrichissement a été lancé. Les données seront disponibles sous peu.",
          });
        } else {
          toast({
            title: "Enrichissement réussi",
            description: "L'entreprise a été enrichie avec succès",
          });
        }
        
        return data.data || null;
      } else {
        toast({
          title: "Erreur d'enrichissement",
          description: data?.error || "Une erreur inconnue s'est produite",
          variant: "destructive"
        });
        return null;
      }

    } catch (error) {
      console.error('💥 Error in enrichCompany:', error);
      toast({
        title: "Erreur d'enrichissement",
        description: "Une erreur s'est produite lors de l'enrichissement",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const getEnrichmentData = async (companyLinkedInId: string) => {
    try {
      const { data, error } = await supabase
        .from('companies_enrichment')
        .select('*')
        .eq('linkedin_id', companyLinkedInId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching enrichment data:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getEnrichmentData:', error);
      return null;
    }
  };

  return {
    enrichCompany,
    getEnrichmentData,
    loading
  };
}
