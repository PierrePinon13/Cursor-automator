
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Persona {
  id: string;
  name: string;
  profileUrl: string;
}

interface LastContactInfo {
  lastContactAt: string;
  contactedBy: string;
  hoursAgo: number;
  daysAgo: number;
}

export const useLastContactCheck = (personas: Persona[]) => {
  const [lastContactChecks, setLastContactChecks] = useState<Record<string, LastContactInfo>>({});
  const [isLoading, setIsLoading] = useState(false);

  const checkLastContacts = async () => {
    if (personas.length === 0) return;
    
    setIsLoading(true);
    const checks: Record<string, LastContactInfo> = {};
    
    try {
      for (const persona of personas) {
        const { data: existingLead } = await supabase
          .from('leads')
          .select('id, last_contact_at, contacted_by_user_name')
          .eq('author_profile_url', persona.profileUrl)
          .eq('lead_source', 'job_search')
          .maybeSingle();

        if (existingLead?.last_contact_at) {
          const lastContactDate = new Date(existingLead.last_contact_at);
          const now = new Date();
          const hoursAgo = (now.getTime() - lastContactDate.getTime()) / (1000 * 60 * 60);
          const daysAgo = hoursAgo / 24;

          if (daysAgo <= 7) {
            checks[persona.id] = {
              lastContactAt: existingLead.last_contact_at,
              contactedBy: existingLead.contacted_by_user_name || 'Utilisateur inconnu',
              hoursAgo: Math.round(hoursAgo * 10) / 10,
              daysAgo: Math.round(daysAgo * 10) / 10
            };
          }
        }
      }
    } catch (error) {
      console.error('Error checking last contacts:', error);
    } finally {
      setIsLoading(false);
    }
    
    setLastContactChecks(checks);
  };

  useEffect(() => {
    if (personas.length > 0) {
      checkLastContacts();
    }
  }, [personas]);

  return {
    lastContactChecks,
    isLoading,
    refetch: checkLastContacts
  };
};
