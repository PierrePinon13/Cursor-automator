
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export function useClientCollaborators(clientId: string) {
  const [collaboratorIds, setCollaboratorIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchCollaborators();
    } else {
      // Reset when clientId is empty (popover closed)
      setCollaboratorIds([]);
      setLoading(false);
    }
  }, [clientId]);

  const fetchCollaborators = async () => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      console.log('🔍 Fetching collaborators for client:', clientId);
      
      const { data, error } = await supabase
        .from('client_collaborators')
        .select('user_id')
        .eq('client_id', clientId);

      if (error) throw error;
      
      const ids = data?.map(item => item.user_id) || [];
      console.log('✅ Collaborator IDs fetched:', ids);
      setCollaboratorIds(ids);
    } catch (error) {
      console.error('❌ Error fetching collaborators:', error);
      setCollaboratorIds([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCollaborators = async (userIds: string[]) => {
    if (!clientId) return;
    
    setLoading(true);
    try {
      console.log('🔄 Updating collaborators for client:', clientId, 'with users:', userIds);
      
      // Supprimer les collaborateurs existants
      const { error: deleteError } = await supabase
        .from('client_collaborators')
        .delete()
        .eq('client_id', clientId);

      if (deleteError) throw deleteError;

      // Ajouter les nouveaux collaborateurs
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

      setCollaboratorIds(userIds);
      console.log('✅ Collaborators updated successfully');
    } catch (error) {
      console.error('❌ Error updating collaborators:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return {
    collaboratorIds,
    loading,
    updateCollaborators,
    refreshCollaborators: fetchCollaborators
  };
}
