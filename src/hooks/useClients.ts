
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
  const [collaboratorsLoading, setCollaboratorsLoading] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
    fetchUsers();
  }, []);

  const fetchClients = async () => {
    try {
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .order('company_name');

      if (clientsError) throw clientsError;

      // Fetch collaborators for each client
      const clientsWithCollaborators = await Promise.all(
        (clientsData || []).map(async (client) => {
          const { data: collaboratorsData, error: collaboratorsError } = await supabase
            .from('client_collaborators')
            .select(`
              user_id,
              profiles (
                id,
                email,
                full_name
              )
            `)
            .eq('client_id', client.id);

          if (collaboratorsError) {
            console.error('Error fetching collaborators:', collaboratorsError);
            return { ...client, collaborators: [] };
          }

          const collaborators = collaboratorsData?.map((item: any) => ({
            id: item.profiles?.id || '',
            email: item.profiles?.email || '',
            full_name: item.profiles?.full_name || null
          })) || [];

          return { ...client, collaborators };
        })
      );

      setClients(clientsWithCollaborators);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('full_name');

      if (error) throw error;
      console.log('Fetched users:', data); // Debug log
      setUsers(data || []);
    } catch (error: any) {
      console.error('Error fetching users:', error);
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

      // Mise à jour immédiate de l'état local
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

  const updateCollaborators = async (clientId: string, userIds: string[]) => {
    setCollaboratorsLoading(prev => new Set(prev).add(clientId));
    
    try {
      console.log('Début mise à jour collaborateurs:', { clientId, userIds });
      
      // Delete existing collaborators
      const { error: deleteError } = await supabase
        .from('client_collaborators')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) throw deleteError;

      // Add new collaborators
      if (userIds.length > 0) {
        const collaborators = userIds.map(userId => ({
          client_id: clientId,
          user_id: userId
        }));

        const { error: insertError } = await supabase
          .from('client_collaborators')
          .insert(collaborators);

        if (insertError) throw insertError;
      }

      // Mise à jour immédiate de l'état local
      setClients(prevClients => 
        prevClients.map(client => {
          if (client.id === clientId) {
            const selectedCollaborators = users.filter(user => userIds.includes(user.id));
            return {
              ...client,
              collaborators: selectedCollaborators
            };
          }
          return client;
        })
      );
      
      console.log('Mise à jour collaborateurs réussie');
    } catch (error: any) {
      console.error('Error updating collaborators:', error);
      throw error;
    } finally {
      setCollaboratorsLoading(prev => {
        const newSet = new Set(prev);
        newSet.delete(clientId);
        return newSet;
      });
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

  const generateLinkedInJobsUrl = () => {
    const trackedClients = getTrackedClients();
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
    collaboratorsLoading,
    createClient,
    updateClient,
    deleteClient,
    updateCollaborators,
    importClients,
    refreshClients: fetchClients,
    getUnqualifiedClients,
    getTrackedClients,
    generateLinkedInJobsUrl,
  };
}
