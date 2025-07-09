
import { useCallback, useState, useEffect, useRef } from 'react';
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
  const pollingActiveRef = useRef(true);

  useEffect(() => {
    pollingActiveRef.current = true; // (ré)active le polling à chaque changement de recherche
  }, [setCurrentSearchId]);

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

  // Charge les résultats suivant un id de recherche (version améliorée avec template)
  const loadSearchResults = useCallback(async (searchId: string) => {
    if (!searchId) {
      console.log('🔄 No searchId provided, clearing results');
      setCurrentResults([]);
      setCurrentSearchId(null);
      setIsLoading(false); // <-- Ajout ici pour éviter le spinner bloqué
      return;
    }

    setIsLoading(true); // <-- Ajout ici pour indiquer le chargement

    console.log('🔄 Loading search results for:', searchId);

    // Récupérer d'abord les informations de la recherche pour le template
    const { data: searchData, error: searchError } = await supabase
      .from('saved_job_searches')
      .select('message_template')
      .eq('id', searchId)
      .single();

    if (searchError) {
      console.error('❌ Error loading search data:', searchError);
      setIsLoading(false); // <-- Ajout ici
    }

    const messageTemplate = searchData?.message_template || '';
    console.log('📝 Message template found:', messageTemplate);

    const { data, error } = await supabase
      .from('job_search_results')
      .select('*')
      .eq('search_id', searchId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error loading search results:', error);
      setIsLoading(false); // <-- Ajout ici
      return;
    }
    
    if (!data || data.length === 0) {
      console.log('📊 No job results found for search:', searchId);
      // Vérifier le champ results_count dans saved_job_searches
      const { data: searchMeta, error: metaError } = await supabase
        .from('saved_job_searches')
        .select('results_count')
        .eq('id', searchId)
        .single();
      if (metaError) {
        console.error('❌ Error loading search meta:', metaError);
        setCurrentResults([]);
        setIsLoading(false);
        return;
      }
      if (searchMeta && searchMeta.results_count === 0) {
        setCurrentResults([]);
        setIsLoading(false);
        return;
      }
      // Cas pathologique : pas de résultats mais results_count non nul (incohérence)
      setCurrentResults([]);
      setIsLoading(false);
      return;
    }
    
    console.log('📊 Raw data loaded:', data.length, 'job results');
    
    const formatted: JobResult[] = data.map(result => {
      let personas = [];
      
      console.log('🔍 Processing job:', result.job_title, 'Raw personas:', result.personas, 'Type:', typeof result.personas);
      
      try {
        if (result.personas) {
          if (typeof result.personas === 'string') {
            try {
              const parsed = JSON.parse(result.personas);
              if (Array.isArray(parsed)) {
                personas = parsed;
                console.log('✅ Successfully parsed personas from string:', personas.length);
              } else {
                console.warn('⚠️ Parsed personas is not an array for job:', result.id, parsed);
              }
            } catch (parseError) {
              console.error('❌ Error parsing personas JSON string:', parseError);
            }
          } else if (Array.isArray(result.personas)) {
            personas = result.personas;
            console.log('✅ Using personas array directly:', personas.length);
          } else if (typeof result.personas === 'object' && result.personas !== null) {
            console.log('🔄 Converting object to array:', result.personas);
            personas = [result.personas];
          } else {
            console.warn('⚠️ Personas format not recognized for job:', result.id, typeof result.personas);
          }
        } else {
          console.log('ℹ️ No personas data for job:', result.job_title);
        }
      } catch (e) {
        console.error('❌ Error processing personas for job:', result.id, e);
        personas = [];
      }

      const normalizedPersonas = personas.map((p: any, index: number) => {
        if (!p || typeof p !== 'object') {
          console.warn('⚠️ Invalid persona at index', index, ':', p);
          return null;
        }
        
        const normalized = {
          id: p.linkedin_id || p.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
          name: p.full_name || p.name || 'Unknown',
          title: p.headline || p.title || '',
          profileUrl: p.public_profile_url || p.profileUrl || '',
          company: p.company || ''
        };
        
        console.log('🔄 Normalized persona:', normalized);
        return normalized;
      }).filter(Boolean);

      console.log('👥 Job', result.job_title, 'final personas count:', normalizedPersonas.length);

      const formattedResult = {
        id: result.id,
        title: result.job_title,
        company: result.company_name,
        location: result.location,
        postedDate: new Date(result.posted_date),
        description: result.job_description || '',
        jobUrl: result.job_url,
        personas: normalizedPersonas,
        company_logo: result.company_logo,
        type: 'CDI',
        messageTemplate: messageTemplate, // Ajouter le template ici
      };
      
      console.log('✅ Formatted job result:', {
        title: formattedResult.title,
        personasCount: formattedResult.personas.length,
        hasTemplate: !!formattedResult.messageTemplate
      });
      
      return formattedResult;
    });
    
    console.log('🎯 Final formatted results summary:', formatted.map(r => ({ 
      title: r.title, 
      personasCount: r.personas.length,
      hasTemplate: !!r.messageTemplate
    })));
    
    console.log('🎯 Setting current results with', formatted.length, 'jobs');
    setCurrentResults(formatted);
    setCurrentSearchId(searchId);
    setIsLoading(false); // <-- Ajout ici après le succès
    
    setTimeout(() => {
      console.log('🔍 Verification: Results should now be set in state');
    }, 100);
  }, [setCurrentResults, setCurrentSearchId]);

  // Fonction utilitaire pour patcher intelligemment les résultats (ajout/mise à jour sans tout remplacer)
  function patchResults(prevResults: JobResult[], newResults: JobResult[]) {
    const prevMap = new Map(prevResults.map(job => [job.id, job]));
    const nextMap = new Map(newResults.map(job => [job.id, job]));
    // Ajout ou update des jobs nouveaux ou modifiés
    const merged = newResults.map(job => {
      const prev = prevMap.get(job.id);
      if (!prev) return job; // Nouveau job
      // Si personas ou autres champs ont changé, remplacer, sinon garder l'ancien objet (pour éviter un re-render)
      if (JSON.stringify(prev.personas) !== JSON.stringify(job.personas)) {
        return job;
      }
      return prev;
    });
    // (Optionnel) Gérer les suppressions si des jobs ont disparu côté backend :
    // Ici, on ne garde que les jobs présents dans newResults (comportement le plus sûr)
    return merged;
  }

  // Écouter les événements de rechargement avec debouncing
  useEffect(() => {
    let reloadTimeout: NodeJS.Timeout;
    
    const handleReloadResults = (event: CustomEvent) => {
      const { searchId } = event.detail;
      console.log('🔄 Reload results event received for:', searchId);
      
      // Debounce pour éviter les rechargements multiples
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
      
      reloadTimeout = setTimeout(async () => {
        if (searchId && pollingActiveRef.current) {
          console.log('🔄 Executing delayed reload for:', searchId);
          // Charger les nouveaux résultats
          const { data, error } = await supabase
            .from('job_search_results')
            .select('*')
            .eq('search_id', searchId)
            .order('created_at', { ascending: false });
          if (error) {
            console.error('❌ Error loading search results (polling):', error);
            return;
          }
          if (!data || data.length === 0) {
            // Vérifier le champ results_count dans saved_job_searches
            const { data: searchMeta, error: metaError } = await supabase
              .from('saved_job_searches')
              .select('results_count')
              .eq('id', searchId)
              .single();
            if (metaError) {
              console.error('❌ Error loading search meta (polling):', metaError);
              setCurrentResults([]);
              setIsLoading(false);
              return;
            }
            if (searchMeta && searchMeta.results_count === 0) {
              setCurrentResults([]);
              setIsLoading(false);
              pollingActiveRef.current = false; // Désactive le polling pour ce searchId
              return;
            }
            setCurrentResults([]);
            setIsLoading(false);
            return;
          }
          // Formatter les nouveaux résultats comme dans loadSearchResults
          const formatted = data.map(result => {
            let personas = [];
            try {
              if (result.personas) {
                if (typeof result.personas === 'string') {
                  try {
                    const parsed = JSON.parse(result.personas);
                    if (Array.isArray(parsed)) {
                      personas = parsed;
                    }
                  } catch {}
                } else if (Array.isArray(result.personas)) {
                  personas = result.personas;
                } else if (typeof result.personas === 'object' && result.personas !== null) {
                  personas = [result.personas];
                }
              }
            } catch {}
            const normalizedPersonas = personas.map((p, index) => {
              if (!p || typeof p !== 'object') return null;
              return {
                id: p.linkedin_id || p.id || `temp-${Math.random().toString(36).substr(2, 9)}`,
                name: p.full_name || p.name || 'Unknown',
                title: p.headline || p.title || '',
                profileUrl: p.public_profile_url || p.profileUrl || '',
                company: p.company || ''
              };
            }).filter(Boolean);
            return {
              id: result.id,
              title: result.job_title,
              company: result.company_name,
              location: result.location,
              postedDate: new Date(result.posted_date),
              description: result.job_description || '',
              jobUrl: result.job_url,
              personas: normalizedPersonas,
              company_logo: result.company_logo,
              type: 'CDI',
              messageTemplate: '', // Pas de template dans le polling
            };
          });
          // Patch intelligent au lieu de remplacer tout le tableau
          setCurrentResults(prev => patchResults(prev, formatted));
          setIsLoading(false);
        }
      }, 500); // Attendre 500ms avant de recharger
    };

    window.addEventListener('reload-job-results', handleReloadResults as EventListener);
    
    return () => {
      window.removeEventListener('reload-job-results', handleReloadResults as EventListener);
      if (reloadTimeout) {
        clearTimeout(reloadTimeout);
      }
    };
  }, [setCurrentResults]);

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

  // Récupère l'unipile_account_id de l'utilisateur connecté
  const getUserUnipileAccountId = useCallback(async () => {
    if (!user?.id) return null;
    
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('unipile_account_id')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('❌ Error fetching user unipile_account_id:', error);
        return null;
      }

      return data?.unipile_account_id || null;
    } catch (error) {
      console.error('❌ Error in getUserUnipileAccountId:', error);
      return null;
    }
  }, [user?.id]);

  // Exécute une recherche instantanée ou sauvegarde
  const executeSearch = useCallback(async (searchConfig: any) => {
    setIsLoading(true);
    try {
      // Récupérer l'unipile_account_id de l'utilisateur
      const unipileAccountId = await getUserUnipileAccountId();
      
      if (!unipileAccountId) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer votre compte Unipile. Veuillez contacter l'administrateur.",
          variant: "destructive"
        });
        return { success: false, error: "Unipile account ID manquant" };
      }

      // On ne transforme plus la localisation en string, on la transmet telle quelle (objet { label, radius? })
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
        unipile_account_id: unipileAccountId, // Ajout de l'unipile_account_id
        search_jobs: {
          ...searchConfig.search_jobs,
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
  }, [user?.id, createSearch, loadSearchResults, setCurrentSearchId, setCurrentResults, getUserUnipileAccountId]);

  // Relance une recherche sauvegardée (ids, location_id_is_known, date en secondes)
  const reRunSavedSearch = useCallback(async (search: any) => {
    if (!user?.id) {
      toast({ title: "Erreur", description: "Utilisateur non connecté", variant: "destructive" });
      return { success: false, error: "Utilisateur non connecté" };
    }
    setIsLoading(true);
    try {
      // Récupérer l'unipile_account_id de l'utilisateur
      const unipileAccountId = await getUserUnipileAccountId();
      
      if (!unipileAccountId) {
        toast({
          title: "Erreur",
          description: "Impossible de récupérer votre compte Unipile. Veuillez contacter l'administrateur.",
          variant: "destructive"
        });
        return { success: false, error: "Unipile account ID manquant" };
      }

      const searchId = search.id;
      // location as text only
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
        unipile_account_id: unipileAccountId, // Ajout de l'unipile_account_id
        search_jobs: {
          ...search.jobFilters,
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
  }, [user?.id, loadSearchResults, invalidateSaved, getUserUnipileAccountId]);

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
