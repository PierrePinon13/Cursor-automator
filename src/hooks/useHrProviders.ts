
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface HrProvider {
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
        .order('created_at', { ascending: false });

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

  const createHrProvider = async (hrProviderData: Omit<HrProvider, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { data, error } = await supabase
        .from('hr_providers')
        .insert([hrProviderData])
        .select()
        .single();

      if (error) throw error;

      setHrProviders(prev => [data, ...prev]);
      toast({
        title: "Succès",
        description: "Prestataire RH créé avec succès.",
      });
      
      return data;
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

  const updateHrProvider = async (id: string, updates: Partial<Omit<HrProvider, 'id' | 'created_at' | 'updated_at'>>) => {
    try {
      const { data, error } = await supabase
        .from('hr_providers')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      setHrProviders(prev => prev.map(hr => hr.id === id ? data : hr));
      toast({
        title: "Succès",
        description: "Prestataire RH mis à jour avec succès.",
      });
      
      return data;
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

      setHrProviders(prev => prev.filter(hr => hr.id !== id));
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

  useEffect(() => {
    fetchHrProviders();
  }, []);

  return {
    hrProviders,
    loading,
    createHrProvider,
    updateHrProvider,
    deleteHrProvider,
    refetch: fetchHrProviders
  };
};
