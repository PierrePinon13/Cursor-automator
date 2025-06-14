
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
      const apiPayload = {
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

      console.log('📤 Données envoyées au webhook N8N:', apiPayload);

      // Si c'est une sauvegarde uniquement
      if (searchConfig.saveOnly) {
        const savedSearch = await createSearch(searchConfig);
        toast({
          title: "Recherche sauvegardée",
          description: "Votre configuration de recherche a été sauvegardée avec succès.",
        });
        return { success: true, searchId: savedSearch.id };
      }

      // Test de connectivité avant l'appel principal
      const N8N_WEBHOOK_URL = 'https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1';
      console.log('🌐 Test de connectivité vers:', N8N_WEBHOOK_URL);

      // Appel à l'API N8N avec timeout et meilleure gestion d'erreur
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('⏰ Timeout de 30 secondes atteint');
        controller.abort();
      }, 30000);

      try {
        console.log('📡 Envoi de la requête vers N8N...');
        
        const response = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(apiPayload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);
        console.log('📥 Réponse reçue de N8N:', response.status, response.statusText);

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Erreur inconnue');
          console.error('❌ Erreur API N8N:', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          });
          throw new Error(`Erreur API N8N: ${response.status} - ${response.statusText}`);
        }

        const results = await response.json();
        console.log('✅ Résultats de l\'API N8N:', results);

        // Transformer les résultats en format attendu
        const formattedResults: JobResult[] = results.jobs?.map((job: any, index: number) => ({
          id: job.id || `job-${index}`,
          title: job.title || job.jobTitle || 'Titre non disponible',
          company: job.company || job.companyName || 'Entreprise non spécifiée',
          location: job.location || 'Localisation non spécifiée',
          postedDate: job.postedDate ? new Date(job.postedDate) : new Date(),
          description: job.description || job.jobDescription || 'Description non disponible',
          jobUrl: job.url || job.jobUrl,
          salary: job.salary,
          personas: job.personas?.map((persona: any, pIndex: number) => ({
            id: persona.id || `persona-${index}-${pIndex}`,
            name: persona.name || persona.fullName || 'Nom non disponible',
            title: persona.title || persona.jobTitle || 'Titre non spécifié',
            profileUrl: persona.profileUrl || persona.linkedinUrl || '#',
            company: persona.company || job.company
          })) || []
        })) || [];

        setCurrentResults(formattedResults);

        // Sauvegarder la recherche avec les résultats
        if (searchConfig.name) {
          const savedSearch = await createSearch({
            ...searchConfig,
            saveOnly: false
          });
          setCurrentSearchId(savedSearch.id);
          
          // Sauvegarder les résultats dans la base
          await saveSearchResults(savedSearch.id, formattedResults);
        }

        toast({
          title: "Recherche terminée",
          description: `${formattedResults.length} résultat(s) trouvé(s).`,
        });
        
        return { success: true, results: formattedResults };

      } catch (fetchError: any) {
        clearTimeout(timeoutId);
        console.error('💥 Erreur détaillée lors de l\'appel N8N:', {
          name: fetchError.name,
          message: fetchError.message,
          stack: fetchError.stack
        });
        
        if (fetchError.name === 'AbortError') {
          throw new Error('⏰ Timeout: La recherche a pris trop de temps à répondre (30s)');
        }
        
        if (fetchError.message === 'Failed to fetch') {
          throw new Error('🌐 Impossible de contacter le serveur N8N. Vérifiez votre connexion internet ou contactez l\'administrateur.');
        }
        
        throw fetchError;
      }

    } catch (error: any) {
      console.error('🚨 Erreur lors de la recherche:', error);
      
      // En cas d'erreur, utiliser des résultats mock pour la démo
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
      
      toast({
        title: "Problème de connexion",
        description: `${error.message} Affichage des résultats de démonstration.`,
        variant: "destructive"
      });
      
      return { success: false, results: mockResults, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, []);

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
