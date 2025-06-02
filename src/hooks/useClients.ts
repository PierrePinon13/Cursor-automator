
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
  tier: string | null;
  tracking_enabled: boolean;
  created_at: string;
  updated_at: string;
  collaborators?: {
    id: string;
    email: string;
    full_name: string | null;
  }[];
}

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

export function useClients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  const fetchClients = async () => {
    try {
      console.log('🔍 Fetching clients...');
      
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('company_name');

      if (clientsError) throw clientsError;
      console.log('✅ Clients fetched:', clientsData?.length || 0);

      setClients(clientsData || []);
    } catch (error: any) {
      console.error('❌ Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('🔍 Fetching users from profiles table...');
      
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      if (error) {
        console.error('❌ Error fetching users:', error);
        throw error;
      }
      
      console.log('✅ Fetched users data:', data);
      console.log('📊 Number of users found:', data?.length || 0);
      
      setUsers(data || []);
    } catch (error: any) {
      console.error('💥 Error in fetchUsers:', error);
      setUsers([]);
    }
  };

  const createClient = async (clientData: Omit<Client, 'id' | 'created_at' | 'updated_at' | 'collaborators'>) => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .insert([clientData])
        .select()
        .single();

      if (error) throw error;

      await fetchClients();
      return data;
    } catch (error: any) {
      console.error('Error creating client:', error);
      throw error;
    }
  };

  const updateClient = async (id: string, clientData: Partial<Client>) => {
    try {
      const { error } = await supabase
        .from('clients')
        .update({ ...clientData, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      // Mettre à jour l'état local immédiatement
      setClients(prevClients => 
        prevClients.map(client => 
          client.id === id ? { ...client, ...clientData } : client
        )
      );
    } catch (error: any) {
      console.error('Error updating client:', error);
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
    }
  };

  const importClients = async (clientsData: any[]) => {
    try {
      const { error } = await supabase
        .from('clients')
        .insert(clientsData);

      if (error) throw error;

      toast({
        title: "Succès",
        description: `${clientsData.length} client(s) importé(s) avec succès.`,
      });

      await fetchClients();
    } catch (error: any) {
      console.error('Error importing clients:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'importer les clients.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const getUnqualifiedClients = () => {
    return clients.filter(client => !client.tier);
  };

  const getTrackedClients = () => {
    return clients.filter(client => client.tracking_enabled);
  };

  // Générer l'URL LinkedIn en temps réel basée sur l'état actuel des clients
  const generateLinkedInJobsUrl = () => {
    const trackedClients = clients.filter(client => client.tracking_enabled);
    const linkedinIds = trackedClients
      .filter(client => client.company_linkedin_id)
      .map(client => client.company_linkedin_id)
      .join('%2C');

    if (!linkedinIds) {
      return null;
    }

    return `https://www.linkedin.com/jobs/search/?f_C=${linkedinIds}&f_TPR=r86400&geoId=105015875&origin=JOB_SEARCH_PAGE_JOB_FILTER&refresh=true`;
  };

  return {
    clients,
    users,
    loading,
    createClient,
    updateClient,
    deleteClient,
    importClients,
    refreshClients: fetchClients,
    getUnqualifiedClients,
    getTrackedClients,
    generateLinkedInJobsUrl,
  };
}
