
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from './use-toast';
import { useAuth } from './useAuth';

interface ClientContact {
  id: string;
  client_id: string;
  created_by_user_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  position: string | null;
  linkedin_url: string | null;
  linkedin_profile_id: string | null;
  unipile_data: any | null;
  unipile_extracted_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface CreateContactData {
  client_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  position?: string;
  linkedin_url?: string;
  notes?: string;
}

export function useClientContacts(clientId?: string) {
  const [contacts, setContacts] = useState<ClientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [extractingLinkedIn, setExtractingLinkedIn] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (clientId) {
      fetchContacts();
    }
  }, [clientId]);

  const fetchContacts = async () => {
    if (!clientId) return;
    
    try {
      console.log('🔍 Fetching contacts for client:', clientId);
      
      const { data, error } = await supabase
        .from('client_contacts')
        .select('*')
        .eq('client_id', clientId)
        .order('first_name');

      if (error) throw error;
      
      console.log('✅ Contacts fetched:', data?.length || 0);
      setContacts(data || []);
    } catch (error: any) {
      console.error('❌ Error fetching contacts:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les contacts.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createContact = async (contactData: CreateContactData) => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer un contact.",
        variant: "destructive",
      });
      return null;
    }

    try {
      console.log('📝 Creating contact:', contactData);

      const { data, error } = await supabase
        .from('client_contacts')
        .insert([{
          ...contactData,
          created_by_user_id: user.id
        }])
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logContactActivity(data.id, 'created', { contact_data: contactData });

      // Extract LinkedIn data if URL provided
      if (contactData.linkedin_url) {
        await extractLinkedInData(data.id, contactData.linkedin_url);
      }

      await fetchContacts();
      
      toast({
        title: "Succès",
        description: "Contact créé avec succès.",
      });

      return data;
    } catch (error: any) {
      console.error('❌ Error creating contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le contact.",
        variant: "destructive",
      });
      return null;
    }
  };

  const updateContact = async (contactId: string, updates: Partial<ClientContact>) => {
    try {
      console.log('📝 Updating contact:', contactId, updates);

      const { data, error } = await supabase
        .from('client_contacts')
        .update(updates)
        .eq('id', contactId)
        .select()
        .single();

      if (error) throw error;

      // Log activity
      await logContactActivity(contactId, 'updated', { updates });

      await fetchContacts();
      
      toast({
        title: "Succès",
        description: "Contact mis à jour avec succès.",
      });

      return data;
    } catch (error: any) {
      console.error('❌ Error updating contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le contact.",
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteContact = async (contactId: string) => {
    try {
      console.log('🗑️ Deleting contact:', contactId);

      const { error } = await supabase
        .from('client_contacts')
        .delete()
        .eq('id', contactId);

      if (error) throw error;

      await fetchContacts();
      
      toast({
        title: "Succès",
        description: "Contact supprimé avec succès.",
      });
    } catch (error: any) {
      console.error('❌ Error deleting contact:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le contact.",
        variant: "destructive",
      });
    }
  };

  const extractLinkedInData = async (contactId: string, linkedinUrl: string) => {
    if (!user) return;

    setExtractingLinkedIn(true);
    try {
      console.log('🔗 Extracting LinkedIn data for:', linkedinUrl);

      // Call unipile scraper function
      const { data, error } = await supabase.functions.invoke('unipile-queue', {
        body: {
          operation: 'profile-scraper',
          profile_url: linkedinUrl,
          contact_id: contactId
        }
      });

      if (error) throw error;

      // Log activity
      await logContactActivity(contactId, 'linkedin_extracted', { 
        linkedin_url: linkedinUrl,
        extraction_result: data 
      });

      toast({
        title: "Extraction en cours",
        description: "Les données LinkedIn sont en cours d'extraction.",
      });

    } catch (error: any) {
      console.error('❌ Error extracting LinkedIn data:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'extraire les données LinkedIn.",
        variant: "destructive",
      });
    } finally {
      setExtractingLinkedIn(false);
    }
  };

  const logContactActivity = async (contactId: string, activityType: string, activityData: any) => {
    if (!user) return;

    try {
      await supabase
        .from('client_contact_activities')
        .insert([{
          contact_id: contactId,
          user_id: user.id,
          activity_type: activityType,
          activity_data: activityData
        }]);
    } catch (error: any) {
      console.error('❌ Error logging contact activity:', error);
    }
  };

  return {
    contacts,
    loading,
    extractingLinkedIn,
    createContact,
    updateContact,
    deleteContact,
    extractLinkedInData,
    refreshContacts: fetchContacts,
  };
}
