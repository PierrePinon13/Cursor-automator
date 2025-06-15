
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export function useSavedSearches() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['saved-job-searches'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      // On récupère les recherches avec le compte de résultats
      const { data: searches, error } = await supabase
        .from('saved_job_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Pour chaque recherche, on compte les résultats réels
      const searchesWithCounts = await Promise.all(
        searches.map(async (search) => {
          const { count, error: countError } = await supabase
            .from('job_search_results')
            .select('*', { count: 'exact', head: true })
            .eq('search_id', search.id);
          
          if (countError) {
            console.error('Error counting results for search', search.id, countError);
          }

          return {
            id: search.id,
            name: search.name,
            jobFilters: search.job_filters,
            personaFilters: search.persona_filters,
            messageTemplate: search.message_template,
            createdAt: new Date(search.created_at),
            lastExecuted: search.last_executed_at ? new Date(search.last_executed_at) : undefined,
            resultsCount: count || 0
          };
        })
      );

      return searchesWithCounts;
    },
    enabled: !!user?.id
  });

  return {
    savedSearches: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    invalidate: () => queryClient.invalidateQueries({ queryKey: ['saved-job-searches'] }),
  };
}
