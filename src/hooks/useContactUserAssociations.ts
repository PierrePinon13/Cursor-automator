
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

interface ContactUserAssociation {
  id: string;
  contact_id: string;
  user_id: string;
  created_at: string;
  created_by_user_id: string;
  profiles: {
    id: string;
    email: string;
    full_name: string | null;
  };
}

export function useContactUserAssociations(contactId?: string) {
  const [associations, setAssociations] = useState<ContactUserAssociation[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (contactId) {
      fetchAssociations();
    }
  }, [contactId]);

  const fetchAssociations = async () => {
    if (!contactId) return;
    
    try {
      console.log('🔍 Fetching associations for contact:', contactId);
      
      const { data, error } = await supabase
        .from('contact_user_associations')
        .select(`
          *,
          profiles (
            id,
            email,
            full_name
          )
        `)
        .eq('contact_id', contactId);

      if (error) throw error;
      
      console.log('✅ Associations fetched:', data?.length || 0);
      setAssociations(data || []);
    } catch (error: any) {
      console.error('❌ Error fetching associations:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les associations utilisateur.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addAssociation = async (userId: string) => {
    if (!user || !contactId) {
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'association.",
        variant: "destructive",
      });
      return null;
    }

    try {
      console.log('➕ Adding association:', { contactId, userId });

      const { data, error } = await supabase
        .from('contact_user_associations')
        .insert([{
          contact_id: contactId,
          user_id: userId,
          created_by_user_id: user.id
        }])
        .select(`
          *,
          profiles (
            id,
            email,
            full_name
          )
        `)
        .single();

      if (error) throw error;

      await fetchAssociations();
      
      toast({
        title: "Succès",
        description: "Utilisateur associé avec succès.",
      });

      return data;
    } catch (error: any) {
      console.error('❌ Error adding association:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'association.",
        variant: "destructive",
      });
      return null;
    }
  };

  const removeAssociation = async (associationId: string) => {
    try {
      console.log('➖ Removing association:', associationId);

      const { error } = await supabase
        .from('contact_user_associations')
        .delete()
        .eq('id', associationId);

      if (error) throw error;

      await fetchAssociations();
      
      toast({
        title: "Succès",
        description: "Association supprimée avec succès.",
      });
    } catch (error: any) {
      console.error('❌ Error removing association:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'association.",
        variant: "destructive",
      });
    }
  };

  return {
    associations,
    loading,
    addAssociation,
    removeAssociation,
    refreshAssociations: fetchAssociations,
  };
}
