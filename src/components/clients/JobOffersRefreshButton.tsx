
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function JobOffersRefreshButton({ onRefresh }: { onRefresh: () => void }) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRefresh = async () => {
    setLoading(true);
    
    try {
      console.log('🔄 Triggering daily jobs refresh...');
      
      const { data, error } = await supabase.functions.invoke('daily-client-jobs-trigger');

      if (error) {
        console.error('❌ Error calling daily-client-jobs-trigger function:', error);
        toast({
          title: "Erreur de rafraîchissement",
          description: "Impossible de lancer la récupération des offres",
          variant: "destructive"
        });
        return;
      }

      if (data?.success) {
        toast({
          title: "Rafraîchissement lancé",
          description: `${data.clients_processed} clients traités pour la récupération des offres`,
        });
        
        // Attendre un peu puis rafraîchir les données
        setTimeout(() => {
          onRefresh();
        }, 2000);
      }

    } catch (error) {
      console.error('💥 Error in handleRefresh:', error);
      toast({
        title: "Erreur de rafraîchissement",
        description: "Une erreur s'est produite lors du rafraîchissement",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button 
      onClick={handleRefresh}
      disabled={loading}
      variant="outline"
      size="sm"
      className="flex items-center gap-2"
    >
      <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
      {loading ? 'Rafraîchissement...' : 'Rafraîchir'}
    </Button>
  );
}
