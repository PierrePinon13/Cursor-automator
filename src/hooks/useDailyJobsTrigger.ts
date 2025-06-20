
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function useDailyJobsTrigger() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const triggerDailyJobs = async () => {
    setLoading(true);
    
    try {
      console.log('🕛 Triggering daily jobs scraping...');
      
      const { data, error } = await supabase.functions.invoke('daily-client-jobs-trigger');

      if (error) {
        console.error('❌ Error calling daily-client-jobs-trigger function:', error);
        toast({
          title: "Erreur de déclenchement",
          description: "Impossible de lancer la récupération quotidienne des offres",
          variant: "destructive"
        });
        return null;
      }

      if (data?.success) {
        toast({
          title: "Récupération lancée",
          description: `${data.clients_processed} clients traités pour la récupération des offres`,
        });
        return data;
      }

    } catch (error) {
      console.error('💥 Error in triggerDailyJobs:', error);
      toast({
        title: "Erreur de déclenchement",
        description: "Une erreur s'est produite lors du déclenchement",
        variant: "destructive"
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  return {
    triggerDailyJobs,
    loading
  };
}
