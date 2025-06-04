
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface HrProvider {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
  created_at: string;
  updated_at: string;
}

export const useHrProviders = () => {
  const [hrProviders, setHrProviders] = useState<HrProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchHrProviders = async () => {
    try {
      const { data, error } = await supabase
        .from('hr_providers')
        .select('*')
        .order('company_name');

      if (error) throw error;
      setHrProviders(data || []);
    } catch (error) {
      console.error('Error fetching HR providers:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les prestataires RH.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createHrProvider = async (data: Omit<HrProvider, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data: newProvider, error } = await supabase
        .from('hr_providers')
        .insert(data)
        .select()
        .single();

      if (error) throw error;

      setHrProviders(prev => [...prev, newProvider]);
      
      // If the new provider has a LinkedIn ID, filter matching leads
      if (newProvider.company_linkedin_id) {
        await filterHrProviderLeads(newProvider.id);
      }

      toast({
        title: "Succès",
        description: "Prestataire RH créé avec succès.",
      });

      return newProvider;
    } catch (error) {
      console.error('Error creating HR provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le prestataire RH.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateHrProvider = async (id: string, data: Partial<HrProvider>) => {
    try {
      const { data: updatedProvider, error } = await supabase
        .from('hr_providers')
        .update(data)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setHrProviders(prev => 
        prev.map(provider => 
          provider.id === id ? updatedProvider : provider
        )
      );

      // If LinkedIn ID was added or updated, filter matching leads
      if (data.company_linkedin_id) {
        await filterHrProviderLeads(id);
      }

      toast({
        title: "Succès",
        description: "Prestataire RH mis à jour avec succès.",
      });

      return updatedProvider;
    } catch (error) {
      console.error('Error updating HR provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le prestataire RH.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteHrProvider = async (id: string) => {
    try {
      const { error } = await supabase
        .from('hr_providers')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setHrProviders(prev => prev.filter(provider => provider.id !== id));

      toast({
        title: "Succès",
        description: "Prestataire RH supprimé avec succès.",
      });
    } catch (error) {
      console.error('Error deleting HR provider:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le prestataire RH.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const filterHrProviderLeads = async (hrProviderId: string) => {
    try {
      console.log('🔍 Filtering leads for HR provider:', hrProviderId);
      
      const { data, error } = await supabase.functions.invoke('filter-hr-provider-leads', {
        body: { hrProviderId }
      });

      if (error) {
        console.error('❌ Error filtering HR provider leads:', error);
        return;
      }

      if (data.success && data.filteredCount > 0) {
        toast({
          title: "Leads filtrés",
          description: `${data.filteredCount} leads de ${data.hrProviderName} ont été filtrés automatiquement.`,
        });
      }

      return data;
    } catch (error) {
      console.error('💥 Error in filterHrProviderLeads:', error);
    }
  };

  useEffect(() => {
    fetchHrProviders();
  }, []);

  return {
    hrProviders,
    loading,
    createHrProvider,
    updateHrProvider,
    deleteHrProvider,
    filterHrProviderLeads,
    refreshHrProviders: fetchHrProviders
  };
};
