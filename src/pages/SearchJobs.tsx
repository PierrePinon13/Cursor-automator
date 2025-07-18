
import { useEffect, useState } from 'react';
import { useSearchJobs } from '@/hooks/useSearchJobs';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { SearchJobsForm } from '@/components/search-jobs/SearchJobsForm';
import { CompactSavedSearches } from '@/components/search-jobs/CompactSavedSearches';
import { SearchResults } from '@/components/search-jobs/SearchResults';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Search, Plus, RefreshCw, Users, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useHiddenJobs } from '@/hooks/useHiddenJobs';

const SearchJobs = () => {
  const navigate = useNavigate();
  const { hiddenJobs, isJobHidden } = useHiddenJobs();
  
  const {
    savedSearches,
    currentResults,
    isLoading,
    executeSearch,
    deleteSearch,
    loadSearchResults,
    reRunSavedSearch,
    currentSearchId
  } = useSearchJobs();

  const [showForm, setShowForm] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<any>(null);
  const [savedSearchesExpanded, setSavedSearchesExpanded] = useState(false);
  const [localResults, setLocalResults] = useState<any[]>([]);

  // Synchroniser les résultats locaux avec les résultats de la recherche
  useEffect(() => {
    if (currentResults) {
      setLocalResults(currentResults);
    }
  }, [currentResults]);

  // Reset explicite des résultats
  const resetCurrentResults = () => {
    setLocalResults([]);
    if (typeof window !== "undefined") {
      const evt = new CustomEvent('job-results-reset');
      window.dispatchEvent(evt);
    }
  };

  // Quand on ferme le formulaire ou la recherche sélectionnée, ré-afficher la liste
  const handleNewSearch = () => {
    setShowForm(true);
    setSelectedSearch(null);
    resetCurrentResults();
    setSavedSearchesExpanded(true);
  };

  const handleExecuteSearch = async (searchConfig: any) => {
    resetCurrentResults();
    const result = await executeSearch(searchConfig);
    setShowForm(false);
    return result;
  };

  const handleDirectExecute = async (search: any) => {
    resetCurrentResults();
    await reRunSavedSearch(search);
  };

  const handleEditSearch = (search: any) => {
    setSelectedSearch(search);
    setShowForm(true);
    resetCurrentResults();
  };

  const handleSelectSearch = (search: any) => {
    setSelectedSearch(search);
    resetCurrentResults();
    if (search?.id) {
      loadSearchResults(search.id);
    } else {
      loadSearchResults(null);
    }
    setSavedSearchesExpanded(false); // Masquer la liste après sélection
  };

  const handleLoadResults = (searchId: string) => {
    const match = savedSearches.find((s) => s.id === searchId);
    if (match) {
      setSelectedSearch(match);
      resetCurrentResults();
      loadSearchResults(searchId);
    } else {
      setSelectedSearch(null);
      resetCurrentResults();
      loadSearchResults(null);
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    await deleteSearch(searchId);
    setSelectedSearch(null);
    resetCurrentResults();
  };

  // Fonction de rafraîchissement simple sans pop-up
  const handleRefresh = () => {
    if (selectedSearch?.id) {
      resetCurrentResults();
      loadSearchResults(selectedSearch.id);
    }
  };

  // Gérer la suppression de personas dans les résultats locaux
  const handlePersonaRemoved = (jobId: string, personaId: string) => {
    setLocalResults(prevResults => 
      prevResults.map(job => 
        job.id === jobId 
          ? { ...job, personas: job.personas.filter((p: any) => p.id !== personaId) }
          : job
      )
    );
  };

  // Synchroniser le reset explicit des résultats avec le state local
  useEffect(() => {
    function listener() {
      if (typeof window !== "undefined" && window.lovableJobResultsHack) {
        window.lovableJobResultsHack([]);
      }
    }
    window.addEventListener('job-results-reset', listener);
    return () => {
      window.removeEventListener('job-results-reset', listener);
    };
  }, []);

  // Abonnement Realtime à job_search_results pour la recherche sélectionnée
  useEffect(() => {
    if (!selectedSearch?.id) return;
    const channel = supabase
      .channel('job_search_results-realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'job_search_results',
        filter: `search_id=eq.${selectedSearch.id}`
      }, (payload) => {
        loadSearchResults(selectedSearch.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSearch?.id, loadSearchResults]);

  // Si la liste des recherches change et que la recherche sélectionnée n'existe plus, on reset
  useEffect(() => {
    if (
      selectedSearch &&
      !savedSearches.some((s) => s.id === selectedSearch.id)
    ) {
      setSelectedSearch(null);
      resetCurrentResults();
    }
  }, [savedSearches, selectedSearch]);

  const handleBulkProspectingForSearch = () => {
    if (!selectedSearch || !localResults || localResults.length === 0) return;
    
    // Filtrer les résultats pour exclure les offres masquées
    const visibleResults = localResults.filter(job => !isJobHidden(job.id));
    
    // Collecter tous les personas de tous les résultats visibles
    const allPersonas = visibleResults
      .filter(job => job.personas && job.personas.length > 0)
      .flatMap(job => job.personas.map(persona => ({
        ...persona,
        jobTitle: job.title,
        jobCompany: job.company,
        jobId: job.id
      })));
    
    if (allPersonas.length === 0) return;
    
    // Construire les paramètres pour la prospection volumique
    const params = new URLSearchParams({
      searchId: selectedSearch.id,
      searchName: selectedSearch.name,
      totalJobs: visibleResults.filter(job => job.personas && job.personas.length > 0).length.toString(),
      totalPersonas: allPersonas.length.toString(),
      personas: JSON.stringify(allPersonas),
      template: selectedSearch.messageTemplate || ''
    });
    
    navigate(`/bulk-prospecting?${params.toString()}`);
  };

  const handleBulkProspectingForSavedSearch = (search: any) => {
    // Construire les paramètres pour la prospection volumique d'une recherche spécifique
    const params = new URLSearchParams({
      searchId: search.id,
      searchName: search.name,
      fromSavedSearch: 'true',
      template: search.messageTemplate || ''
    });
    
    navigate(`/bulk-prospecting?${params.toString()}`);
  };

  return (
    <PageLayout>
      <GlobalPageHeader
        title="Search Jobs"
        subtitle="Rechercher des offres d'emploi et cibler des prospects automatiquement"
        icon={<Search className="h-6 w-6 text-blue-600" />}
        breadcrumbs={[
          { label: "Accueil", href: "/" },
          { label: "Search Jobs" }
        ]}
        actions={
          <div className="flex gap-2">
            {selectedSearch && localResults && localResults.length > 0 && (
              <Button 
                onClick={handleBulkProspectingForSearch}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                disabled={!localResults.filter(job => !isJobHidden(job.id)).some(job => job.personas && job.personas.length > 0)}
              >
                <Users className="h-4 w-4" />
                Prospection volumique ({localResults.filter(job => !isJobHidden(job.id) && job.personas && job.personas.length > 0).length} offres)
              </Button>
            )}
            <Button onClick={handleNewSearch} className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nouvelle recherche
            </Button>
          </div>
        }
      />

      <div className="space-y-6">
        {/* Formulaire de recherche */}
        {showForm && (
          <SearchJobsForm
            onSubmit={handleExecuteSearch}
            onCancel={() => {
              setShowForm(false);
              setSavedSearchesExpanded(true);
            }}
            initialData={selectedSearch}
          />
        )}

        {/* Recherches sauvegardées - Interface directe */}
        {savedSearches.length > 0 && (
          <div className="space-y-4">
            <div 
              className="flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => setSavedSearchesExpanded(!savedSearchesExpanded)}
            >
              {savedSearchesExpanded ? (
                <ChevronDown className="h-5 w-5" />
              ) : (
                <ChevronRight className="h-5 w-5" />
              )}
              <h3 className="text-lg font-semibold">
                Recherches sauvegardées ({savedSearches.length})
              </h3>
            </div>
            
            {savedSearchesExpanded && (
              <CompactSavedSearches
                searches={savedSearches}
                onExecute={handleDirectExecute}
                onEdit={handleEditSearch}
                onDelete={handleDeleteSearch}
                onLoadResults={handleLoadResults}
                onSelect={handleSelectSearch}
                onBulkProspecting={handleBulkProspectingForSavedSearch}
                selectedSearchId={selectedSearch?.id}
              />
            )}
          </div>
        )}

        {/* Guide pour créer la première recherche */}
        {savedSearches.length === 0 && !showForm && (
          <div className="text-center py-16 bg-white rounded-lg border-2 border-dashed border-gray-200">
            <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Aucune recherche sauvegardée
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              Créez votre première recherche d'emplois pour commencer à identifier et cibler des prospects automatiquement.
            </p>
            <Button onClick={handleNewSearch} className="flex items-center gap-2 mx-auto">
              <Plus className="h-4 w-4" />
              Créer ma première recherche
            </Button>
          </div>
        )}

        {/* Résultats */}
        {selectedSearch && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <h3 className="text-xl font-bold text-gray-900">
                Résultats pour : <span className="text-blue-700">{selectedSearch.name}</span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleRefresh}
                className="flex items-center gap-2"
                title="Rafraîchir les résultats"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Rafraîchir
              </Button>
            </div>
            <SearchResults
              results={localResults}
              isLoading={isLoading}
              messageTemplate={selectedSearch?.messageTemplate || ''}
              key={selectedSearch.id}
              showBulkProspectingButton={false}
              onPersonaRemoved={handlePersonaRemoved}
            />
          </div>
        )}

        {/* Guide UX si aucune recherche sélectionnée mais qu'il y en a des sauvegardées */}
        {!selectedSearch && savedSearches.length > 0 && (
          <div className="text-gray-500 text-center py-16">
            <Search className="h-10 w-10 mx-auto mb-4 text-blue-300" />
            <div className="text-lg font-semibold">Cliquez sur une recherche sauvegardée pour afficher ses résultats.</div>
            <div className="text-sm mt-2">Vous pouvez exécuter une recherche, l'éditer ou voir ses résultats plus tard.</div>
          </div>
        )}
      </div>

      {/* Bouton d'action flottant */}
      <FloatingActionButton
        onClick={handleNewSearch}
        icon={<Plus className="h-5 w-5" />}
      />
    </PageLayout>
  );
};

export default SearchJobs;
