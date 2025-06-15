import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

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
  jobUrl?: string;
  salary?: string;
  personas: Array<{
    id: string;
    name: string;
    title: string;
    profileUrl: string;
    company?: string;
  }>;
}

export const useSearchJobs = () => {
  const [currentResults, setCurrentResults] = useState<JobResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentSearchId, setCurrentSearchId] = useState<string | null>(null);
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
      console.log('🔍 Configuration de recherche reçue:', searchConfig);
      
      // Transformer les localisations pour l'API
      const locationIds = searchConfig.search_jobs.location
        .filter((loc: SelectedLocation) => loc.geoId !== null)
        .map((loc: SelectedLocation) => loc.geoId);
      
      // Localisations non résolues (à traiter par N8N)
      const unresolvedLocations = searchConfig.search_jobs.location
        .filter((loc: SelectedLocation) => loc.geoId === null)
        .map((loc: SelectedLocation) => loc.label);

      // Préparer les données pour l'API avec la structure correcte
      let apiPayload: any = {
        name: searchConfig.name,
        search_jobs: {
          ...searchConfig.search_jobs,
          location: locationIds,
          unresolved_locations: unresolvedLocations.length > 0 ? unresolvedLocations : undefined
        },
        personna_filters: {
          ...searchConfig.personna_filters,
          role: {
            keywords: Array.isArray(searchConfig.personna_filters.role) 
              ? searchConfig.personna_filters.role 
              : searchConfig.personna_filters.role?.keywords || []
          }
        },
        message_template: searchConfig.message_template,
        saveOnly: searchConfig.saveOnly
      };

      console.log('📤 Données envoyées au webhook N8N (avant ajout search_id):', apiPayload);

      // Si c'est une sauvegarde uniquement, on n'appelle pas N8N
      if (searchConfig.saveOnly) {
        const savedSearch = await createSearch(searchConfig);
        toast({
          title: "Recherche sauvegardée",
          description: "Votre configuration de recherche a été sauvegardée avec succès.",
        });
        return { success: true, searchId: savedSearch.id };
      }

      // Sauvegarder d'abord la recherche si elle a un nom
      let savedSearchId = null;
      if (searchConfig.name && user?.id) {
        try {
          const savedSearch = await createSearch({
            ...searchConfig,
            saveOnly: false
          });
          savedSearchId = savedSearch.id;
          setCurrentSearchId(savedSearchId);
          console.log('✅ Recherche sauvegardée avec ID:', savedSearchId);

          // search_id dans payload
          apiPayload = {
            ...apiPayload,
            search_id: savedSearchId,
          };
          console.log('✅ search_id ajouté au payload N8N:', savedSearchId);

        } catch (saveError) {
          console.error('⚠️ Erreur lors de la sauvegarde (continuons quand même):', saveError);
        }
      }

      // Appel à l'API N8N (inspiré de process-dataset)
      const N8N_WEBHOOK_URL = 'https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1';
      console.log('🌐 Envoi vers N8N:', N8N_WEBHOOK_URL);

      try {
        console.log('📡 Envoi de la requête vers N8N...');
        
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload)
        });

        console.log('📊 Réponse N8N - Status:', response.status);

        if (response.ok) {
          console.log('✅ Requête envoyée avec succès vers N8N');
          
          // Résultats de test en attendant la vraie réponse de N8N
          const mockResults: JobResult[] = [
            {
              id: '1',
              title: 'Senior React Developer',
              company: 'TechCorp France',
              location: 'Paris, France',
              postedDate: new Date('2024-01-18'),
              description: 'Nous recherchons un développeur React expérimenté pour rejoindre notre équipe dynamique. Vous travaillerez sur des projets innovants utilisant les dernières technologies.',
              jobUrl: 'https://example.com/job/1',
              salary: '50-70k€',
              personas: [
                {
                  id: '1',
                  name: 'Jean Dupont',
                  title: 'CTO',
                  profileUrl: 'https://linkedin.com/in/jean-dupont',
                  company: 'TechCorp France'
                },
                {
                  id: '2',
                  name: 'Marie Martin',
                  title: 'Tech Lead',
                  profileUrl: 'https://linkedin.com/in/marie-martin',
                  company: 'TechCorp France'
                }
              ]
            },
            {
              id: '2',
              title: 'Frontend Developer React',
              company: 'StartupXYZ',
              location: 'Lyon, France',
              postedDate: new Date('2024-01-17'),
              description: 'Rejoignez notre équipe dynamique et participez au développement de notre plateforme SaaS révolutionnaire.',
              jobUrl: 'https://example.com/job/2',
              personas: [
                {
                  id: '3',
                  name: 'Pierre Leroy',
                  title: 'Engineering Manager',
                  profileUrl: 'https://linkedin.com/in/pierre-leroy',
                  company: 'StartupXYZ'
                }
              ]
            }
          ];

          setCurrentResults(mockResults);

          // Sauvegarder les résultats si on a un searchId
          if (savedSearchId) {
            await saveSearchResults(savedSearchId, mockResults);
          }

          toast({
            title: "Recherche lancée",
            description: `Requête envoyée avec succès vers N8N (status: ${response.status}). Affichage des résultats de test.`,
          });
          
          return { success: true, results: mockResults, searchId: savedSearchId };

        } else {
          const errorText = await response.text();
          console.error('❌ Erreur N8N - Status:', response.status, 'Response:', errorText);
          throw new Error(`Erreur N8N (${response.status}): ${errorText}`);
        }

      } catch (fetchError: any) {
        console.error('💥 Erreur détaillée lors de l\'appel N8N:', fetchError);
        throw new Error(`Erreur lors de l'envoi vers N8N: ${fetchError.message}`);
      }

    } catch (error: any) {
      console.error('🚨 Erreur lors de la recherche:', error);
      
      toast({
        title: "Erreur",
        description: error.message,
        variant: "destructive"
      });
      
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, createSearch, saveSearchResults, setCurrentSearchId, setCurrentResults]);

  const createSearch = useCallback(async (searchConfig: any) => {
    if (!user?.id) {
      throw new Error('Utilisateur non connecté');
    }

    const { data, error } = await supabase
      .from('saved_job_searches')
      .insert({
        name: searchConfig.name,
        user_id: user.id,
        job_filters: searchConfig.search_jobs,
        persona_filters: searchConfig.personna_filters,
        message_template: searchConfig.message_template,
        last_executed_at: searchConfig.saveOnly ? null : new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      console.error('Erreur lors de la sauvegarde:', error);
      throw error;
    }

    // Invalider le cache pour recharger les données
    queryClient.invalidateQueries({ queryKey: ['saved-job-searches'] });
    
    return data;
  }, [user?.id, queryClient]);

  const saveSearchResults = useCallback(async (searchId: string, results: JobResult[]) => {
    try {
      const resultsData = results.map(result => ({
        search_id: searchId,
        job_title: result.title,
        company_name: result.company,
        location: result.location,
        posted_date: result.postedDate.toISOString(),
        job_description: result.description,
        job_url: result.jobUrl,
        personas: JSON.stringify(result.personas)
      }));

      const { error } = await supabase
        .from('job_search_results')
        .insert(resultsData);

      if (error) {
        console.error('Erreur lors de la sauvegarde des résultats:', error);
      }

      // Mettre à jour le compteur de résultats
      await supabase
        .from('saved_job_searches')
        .update({ results_count: results.length })
        .eq('id', searchId);

    } catch (error) {
      console.error('Erreur lors de la sauvegarde des résultats:', error);
    }
  }, []);

  const loadSearchResults = useCallback(async (searchId: string) => {
    try {
      const { data, error } = await supabase
        .from('job_search_results')
        .select('*')
        .eq('search_id', searchId);

      if (error) {
        console.error('Erreur lors du chargement des résultats:', error);
        return;
      }

      const formattedResults: JobResult[] = data.map(result => ({
        id: result.id,
        title: result.job_title,
        company: result.company_name,
        location: result.location,
        postedDate: new Date(result.posted_date),
        description: result.job_description || '',
        jobUrl: result.job_url,
        personas: result.personas ? JSON.parse(result.personas as string) : []
      }));

      setCurrentResults(formattedResults);
      setCurrentSearchId(searchId);
    } catch (error) {
      console.error('Erreur lors du chargement des résultats:', error);
    }
  }, []);

  const deleteSearch = useCallback(async (searchId: string) => {
    try {
      // Supprimer d'abord les résultats associés
      await supabase
        .from('job_search_results')
        .delete()
        .eq('search_id', searchId);

      // Puis supprimer la recherche
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
      
      // Si on affichait les résultats de cette recherche, les effacer
      if (currentSearchId === searchId) {
        setCurrentResults([]);
        setCurrentSearchId(null);
      }
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  }, [queryClient, currentSearchId]);

  return {
    savedSearches,
    currentResults,
    isLoading: isLoading || isLoadingSaved,
    executeSearch,
    createSearch,
    deleteSearch,
    loadSearchResults,
    currentSearchId
  };
};
