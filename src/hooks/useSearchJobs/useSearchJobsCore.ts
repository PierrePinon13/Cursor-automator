import { useCallback, useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { JobResult } from './useCurrentJobResults';

interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

export function useSearchJobsCore({ setCurrentResults, setCurrentSearchId, invalidateSaved }) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Crée une recherche
  const createSearch = useCallback(async (searchConfig: any) => {
    if (!user?.id) throw new Error('Utilisateur non connecté');
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
    if (error) throw error;
    invalidateSaved();
    return data;
  }, [user?.id, invalidateSaved]);

  // Sauvegarde les résultats
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
      await supabase.from('job_search_results').insert(resultsData);
      await supabase.from('saved_job_searches').update({ results_count: results.length }).eq('id', searchId);
    } catch (error) {
      // Silencieusement
    }
  }, []);

  // Charge les résultats suivant un id de recherche (version améliorée)
  const loadSearchResults = useCallback(async (searchId: string) => {
    if (!searchId) {
      setCurrentResults([]);
      setCurrentSearchId(null);
      return;
    }

    const { data, error } = await supabase
      .from('job_search_results')
      .select('*')
      .eq('search_id', searchId);
    
    if (!data || error) {
      console.error('Error loading search results:', error);
      return;
    }
    
    const formatted: JobResult[] = data.map(result => ({
      id: result.id,
      title: result.job_title,
      company: result.company_name,
      location: result.location,
      postedDate: new Date(result.posted_date),
      description: result.job_description || '',
      jobUrl: result.job_url,
      personas: result.personas ? JSON.parse(result.personas as string) : [],
      company_logo: result.company_logo,
    }));
    
    setCurrentResults(formatted);
    setCurrentSearchId(searchId);
  }, [setCurrentResults, setCurrentSearchId]);

  // Écouter les événements de rechargement
  useEffect(() => {
    const handleReloadResults = (event: CustomEvent) => {
      const { searchId } = event.detail;
      if (searchId) {
        loadSearchResults(searchId);
      }
    };

    window.addEventListener('reload-job-results', handleReloadResults as EventListener);
    
    return () => {
      window.removeEventListener('reload-job-results', handleReloadResults as EventListener);
    };
  }, [loadSearchResults]);

  // Supprime une recherche
  const deleteSearch = useCallback(async (searchId: string) => {
    await supabase.from('job_search_results').delete().eq('search_id', searchId);
    await supabase.from('saved_job_searches').delete().eq('id', searchId);
    invalidateSaved();
    setCurrentResults([]);
    setCurrentSearchId(null);
    toast({
      title: "Recherche supprimée",
      description: "La recherche a été supprimée avec succès.",
    });
  }, [setCurrentResults, setCurrentSearchId, invalidateSaved]);

  // Exécute une recherche instantanée ou sauvegarde
  const executeSearch = useCallback(async (searchConfig: any) => {
    setIsLoading(true);
    try {
      // On force location à n'être que des chaînes de caractères (jamais d'ID !)
      const locations = searchConfig.search_jobs.location;
      const locationLabels = locations.map((loc: any) => {
        // Si c'est déjà une chaîne, on garde.
        if (typeof loc === "string") return loc;
        // Si c'est un objet avec un label string, on prend le label.
        if (loc && typeof loc.label === "string") return loc.label;
        // Si c'est juste un nombre ou tout autre cas, on jette.
        return "";
      }).filter(Boolean);

      const location_id_is_known = false;

      // date_posted reste converti en secondes (24h, semaine, mois)
      let datePostedSeconds: string | "" = "";
      if (searchConfig.search_jobs.date_posted !== "" && searchConfig.search_jobs.date_posted !== undefined) {
        const days = Number(searchConfig.search_jobs.date_posted);
        if (!isNaN(days)) {
          datePostedSeconds = String(days * 24 * 3600);
        }
      }

      let apiPayload: any = {
        name: searchConfig.name,
        search_jobs: {
          ...searchConfig.search_jobs,
          location: locationLabels,
          location_id_is_known,
          date_posted: datePostedSeconds,
        },
        personna_filters: {
          ...searchConfig.personna_filters,
          role: Array.isArray(searchConfig.personna_filters.role)
            ? { keywords: searchConfig.personna_filters.role }
            : { keywords: searchConfig.personna_filters.role?.keywords || [] },
          // Ajouter la location pour la recherche de profils
          location: searchConfig.personna_filters.location || ""
        },
        message_template: searchConfig.message_template,
        saveOnly: searchConfig.saveOnly
      };

      if (searchConfig.saveOnly) {
        const savedSearch = await createSearch(searchConfig);
        toast({ title: "Recherche sauvegardée", description: "Votre configuration de recherche a été sauvegardée avec succès." });
        return { success: true, searchId: savedSearch.id };
      }

      let savedSearchId = null;
      if (searchConfig.name && user?.id) {
        try {
          const savedSearch = await createSearch({ ...searchConfig, saveOnly: false });
          savedSearchId = savedSearch.id;
          setCurrentSearchId(savedSearchId);
          apiPayload = { ...apiPayload, search_id: savedSearchId };
        } catch {}
      }

      const N8N_WEBHOOK_URL = 'https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1';
      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (response.ok) {
        toast({
          title: "Recherche lancée",
          description: `Requête envoyée avec succès vers N8N (status: ${response.status}). Données à venir.`,
        });
        if (savedSearchId) {
          await loadSearchResults(savedSearchId);
        } else {
          setCurrentResults([]);
        }
        return { success: true, searchId: savedSearchId };
      } else {
        const errorText = await response.text();
        throw new Error(`Erreur N8N (${response.status}): ${errorText}`);
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, createSearch, loadSearchResults, setCurrentSearchId, setCurrentResults]);

  // Relance une recherche sauvegardée (ids, location_id_is_known, date en secondes)
  const reRunSavedSearch = useCallback(async (search: any) => {
    if (!user?.id) {
      toast({ title: "Erreur", description: "Utilisateur non connecté", variant: "destructive" });
      return { success: false, error: "Utilisateur non connecté" };
    }
    setIsLoading(true);
    try {
      const searchId = search.id;
      // location as text only
      const locations = search.jobFilters.location;
      const locationLabels = locations.map((loc: any) => {
        if (typeof loc === "string") return loc;
        if (loc && typeof loc.label === "string") return loc.label;
        return "";
      }).filter(Boolean);

      const location_id_is_known = false;

      let datePostedSeconds: string | "" = "";
      if (search.jobFilters.date_posted !== "" && search.jobFilters.date_posted !== undefined) {
        const days = Number(search.jobFilters.date_posted);
        if (!isNaN(days)) {
          datePostedSeconds = String(days * 24 * 3600);
        }
      }

      let apiPayload: any = {
        name: search.name,
        search_jobs: {
          ...search.jobFilters,
          location: locationLabels,
          location_id_is_known,
          date_posted: datePostedSeconds,
        },
        personna_filters: {
          ...search.personaFilters,
          role: Array.isArray(search.personaFilters.role)
            ? { keywords: search.personaFilters.role }
            : { keywords: search.personaFilters.role?.keywords || [] },
          // Ajouter la location pour la recherche de profils
          location: search.personaFilters.location || ""
        },
        message_template: search.messageTemplate,
        saveOnly: false,
        search_id: searchId,
      };

      const N8N_WEBHOOK_URL = 'https://n8n.getpro.co/webhook/dbffc3a4-dba8-49b9-9628-109e8329ddb1';

      const response = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(apiPayload)
      });

      if (response.ok) {
        await supabase.from('saved_job_searches').update({ last_executed_at: new Date().toISOString() }).eq('id', searchId);
        toast({
          title: "Recherche relancée",
          description: "Les nouveaux résultats seront affichés dès qu'ils seront disponibles.",
        });
        await loadSearchResults(searchId);
        invalidateSaved();
        return { success: true, searchId };
      } else {
        const errorText = await response.text();
        toast({ title: "Erreur", description: `Erreur N8N (${response.status}): ${errorText}`, variant: "destructive" });
        return { success: false, error: errorText };
      }
    } catch (e: any) {
      toast({ title: "Erreur", description: "Impossible de relancer la recherche", variant: "destructive" });
      return { success: false, error: e.message };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, loadSearchResults, invalidateSaved]);

  return {
    isLoading,
    createSearch,
    saveSearchResults,
    loadSearchResults,
    deleteSearch,
    executeSearch,
    reRunSavedSearch
  }
}
