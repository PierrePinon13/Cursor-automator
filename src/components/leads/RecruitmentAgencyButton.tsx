
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Building2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface RecruitmentAgencyButtonProps {
  lead: {
    id: string;
    author_name: string;
    unipile_company?: string;
    company_name?: string;
    unipile_company_linkedin_id?: string;
    company_linkedin_id?: string;
  };
  onActionCompleted: () => void;
}

const RecruitmentAgencyButton = ({ lead, onActionCompleted }: RecruitmentAgencyButtonProps) => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleMarkAsRecruitmentAgency = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour effectuer cette action",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // Récupérer le nom de l'entreprise (priorité à unipile_company)
      const companyName = lead.unipile_company || lead.company_name || 'Entreprise inconnue';
      const companyLinkedInId = lead.unipile_company_linkedin_id || lead.company_linkedin_id;

      console.log('🏢 Marking lead as recruitment agency:', {
        leadId: lead.id,
        companyName,
        companyLinkedInId
      });

      // 1. Créer ou récupérer le cabinet de recrutement
      let hrProviderId: string;
      let hrProviderName: string;

      // Vérifier si le cabinet existe déjà
      if (companyLinkedInId) {
        const { data: existingProvider } = await supabase
          .from('hr_providers')
          .select('id, company_name')
          .eq('company_linkedin_id', companyLinkedInId)
          .single();

        if (existingProvider) {
          hrProviderId = existingProvider.id;
          hrProviderName = existingProvider.company_name;
          console.log('✅ Found existing HR provider:', hrProviderName);
        } else {
          // Créer un nouveau cabinet
          const { data: newProvider, error: createError } = await supabase
            .from('hr_providers')
            .insert({
              company_name: companyName,
              company_linkedin_id: companyLinkedInId,
              company_linkedin_url: null
            })
            .select()
            .single();

          if (createError) throw createError;
          
          hrProviderId = newProvider.id;
          hrProviderName = newProvider.company_name;
          console.log('✅ Created new HR provider:', hrProviderName);
        }
      } else {
        // Pas de LinkedIn ID, créer quand même le cabinet
        const { data: newProvider, error: createError } = await supabase
          .from('hr_providers')
          .insert({
            company_name: companyName,
            company_linkedin_id: null,
            company_linkedin_url: null
          })
          .select()
          .single();

        if (createError) throw createError;
        
        hrProviderId = newProvider.id;
        hrProviderName = newProvider.company_name;
        console.log('✅ Created new HR provider without LinkedIn ID:', hrProviderName);
      }

      // 2. Marquer le lead comme cabinet de recrutement
      const { error: updateError } = await supabase
        .from('leads')
        .update({
          processing_status: 'filtered_hr_provider',
          matched_hr_provider_id: hrProviderId,
          matched_hr_provider_name: hrProviderName,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (updateError) throw updateError;

      console.log('✅ Lead marked as recruitment agency');

      toast({
        title: "Cabinet de recrutement",
        description: `${hrProviderName} a été ajouté comme cabinet de recrutement et le lead a été filtré.`,
      });

      onActionCompleted();

    } catch (error) {
      console.error('❌ Error marking as recruitment agency:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme cabinet de recrutement.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleMarkAsRecruitmentAgency}
      disabled={loading}
      variant="outline"
      className="w-full h-10 justify-start bg-white hover:bg-orange-50 border-orange-200"
    >
      <Building2 className="h-4 w-4 mr-2 text-orange-600" />
      {loading ? 'Traitement...' : 'Cabinet de recrutement'}
    </Button>
  );
};

export default RecruitmentAgencyButton;
