
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';

interface Client {
  id: string;
  company_name: string;
  company_linkedin_url: string | null;
  company_linkedin_id: string | null;
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

          const collaborators = collaboratorsData?.map(item => ({
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
      toast({
        title: "Erreur",
        description: "Impossible de récupérer les clients.",
        variant: "destructive",
      });
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

      toast({
        title: "Succès",
        description: "Client créé avec succès.",
      });

      await fetchClients();
      return data;
    } catch (error: any) {
      console.error('Error creating client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le client.",
        variant: "destructive",
      });
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

      toast({
        title: "Succès",
        description: "Client mis à jour avec succès.",
      });

      await fetchClients();
    } catch (error: any) {
      console.error('Error updating client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le client.",
        variant: "destructive",
      });
    }
  };

  const deleteClient = async (id: string) => {
    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Succès",
        description: "Client supprimé avec succès.",
      });

      await fetchClients();
    } catch (error: any) {
      console.error('Error deleting client:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le client.",
        variant: "destructive",
      });
    }
  };

  const updateCollaborators = async (clientId: string, userIds: string[]) => {
    try {
      // Delete existing collaborators
      await supabase
        .from('client_collaborators')
        .delete()
        .eq('client_id', clientId);

      // Add new collaborators
      if (userIds.length > 0) {
        const collaborators = userIds.map(userId => ({
          client_id: clientId,
          user_id: userId
        }));

        const { error } = await supabase
          .from('client_collaborators')
          .insert(collaborators);

        if (error) throw error;
      }

      await fetchClients();
    } catch (error: any) {
      console.error('Error updating collaborators:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour les collaborateurs.",
        variant: "destructive",
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

  return {
    clients,
    users,
    loading,
    createClient,
    updateClient,
    deleteClient,
    updateCollaborators,
    importClients,
    refreshClients: fetchClients,
  };
}
