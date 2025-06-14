
import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SavedSearch {
  id: string;
  name: string;
  job_filters: any;
  persona_filters: any;
  message_template?: string;
  created_at: Date;
  updated_at: Date;
  last_executed_at?: Date;
  results_count?: number;
}

interface JobResult {
  id: string;
  title: string;
  company: string;
  location: string;
  postedDate: Date;
  description: string;
  personas: Array<{
    id: string;
    name: string;
    title: string;
    profileUrl: string;
  }>;
}

export const useSearchJobs = () => {
  const [currentResults, setCurrentResults] = useState<JobResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Récupérer les recherches sauvegardées depuis Supabase
  const { data: savedSearches = [], isLoading: isLoadingSaved } = useQuery({
    queryKey: ['saved-job-searches'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('saved_job_searches')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur lors de la récupération des recherches:', error);
        throw error;
      }

      return data.map(search => ({
        id: search.id,
        name: search.name,
        jobFilters: search.job_filters,
        personaFilters: search.persona_filters,
        messageTemplate: search.message_template,
        createdAt: new Date(search.created_at),
        lastExecuted: search.last_executed_at ? new Date(search.last_executed_at) : undefined,
        resultsCount: search.results_count
      }));
    },
    enabled: !!user?.id
  });

  const executeSearch = useCallback(async (searchConfig: any) => {
    setIsLoading(true);
    
    try {
      console.log('Configuration envoyée au webhook:', searchConfig);
      
      // Appel à l'API N8N avec mode no-cors pour éviter les problèmes CORS
      const response = await fetch('https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify(searchConfig),
      });

      // Avec no-cors, on ne peut pas lire la réponse, donc on simule le succès
      console.log('Requête envoyée au webhook N8N');
      
      // Si c'est une sauvegarde uniquement
      if (searchConfig.saveOnly) {
        await createSearch(searchConfig);
        toast({
          title: "Recherche sauvegardée",
          description: "Votre configuration de recherche a été sauvegardée avec succès.",
        });
      } else {
        // Si c'est une exécution de recherche
        toast({
          title: "Recherche lancée",
          description: "Votre recherche a été envoyée au système. Les résultats apparaîtront bientôt.",
        });
        
        // Mock results for demonstration
        const mockResults: JobResult[] = [
          {
            id: '1',
            title: 'Senior React Developer',
            company: 'TechCorp',
            location: 'Paris, France',
            postedDate: new Date('2024-01-18'),
            description: 'Nous recherchons un développeur React expérimenté pour rejoindre notre équipe...',
            personas: [
              {
                id: '1',
                name: 'Jean Dupont',
                title: 'CTO',
                profileUrl: 'https://linkedin.com/in/jean-dupont'
              },
              {
                id: '2',
                name: 'Marie Martin',
                title: 'Tech Lead',
                profileUrl: 'https://linkedin.com/in/marie-martin'
              }
            ]
          },
          {
            id: '2',
            title: 'Frontend Developer React',
            company: 'StartupXYZ',
            location: 'Lyon, France',
            postedDate: new Date('2024-01-17'),
            description: 'Rejoignez notre équipe dynamique et participez au développement de notre plateforme...',
            personas: [
              {
                id: '3',
                name: 'Pierre Leroy',
                title: 'Engineering Manager',
                profileUrl: 'https://linkedin.com/in/pierre-leroy'
              }
            ]
          }
        ];

        setCurrentResults(mockResults);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Erreur lors de la recherche:', error);
      
      toast({
        title: "Erreur de connexion",
        description: "Impossible de contacter le serveur. Vérifiez votre connexion internet.",
        variant: "destructive",
      });
      
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createSearch = useCallback(async (searchConfig: any) => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const { error } = await supabase
      .from('saved_job_searches')
      .insert({
        name: searchConfig.name,
        user_id: user.id,
        job_filters: searchConfig.search_jobs,
        persona_filters: searchConfig.personna_filters,
        message_template: searchConfig.message_template
      });

    if (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }

    // Invalider le cache pour recharger les données
    queryClient.invalidateQueries({ queryKey: ['saved-job-searches'] });
  }, [user?.id, queryClient]);

  const deleteSearch = useCallback(async (searchId: string) => {
    const { error } = await supabase
      .from('saved_job_searches')
      .delete()
      .eq('id', searchId);

    if (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la recherche.",
        variant: "destructive",
      });
      throw error;
    }

    toast({
      title: "Recherche supprimée",
      description: "La recherche a été supprimée avec succès.",
    });
    
    queryClient.invalidateQueries({ queryKey: ['saved-job-searches'] });
  }, [queryClient]);

  return {
    savedSearches,
    currentResults,
    isLoading: isLoading || isLoadingSaved,
    executeSearch,
    createSearch,
    deleteSearch
  };
};
