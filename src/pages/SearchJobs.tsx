import { useEffect, useState } from 'react';
import { useSearchJobs } from '@/hooks/useSearchJobs';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { SearchJobsForm } from '@/components/search-jobs/SearchJobsForm';
import { CompactSavedSearches } from '@/components/search-jobs/CompactSavedSearches';
import { SearchResults } from '@/components/search-jobs/SearchResults';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Search, Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

const SearchJobs = () => {
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

  // Ajout: avoir accès à la méthode de reset des résultats
  // Correction: nettoie les résultats à chaque changement explicite de recherche pour éviter flash data obsolète

  // Nouvelle méthode: reset explicite des résultats (appelée en début de chaque sélection)
  const resetCurrentResults = () => {
    if (typeof window !== "undefined") {
      // sécurité SSR même si normalement jamais utile pour une page dashboard
      const evt = new CustomEvent('job-results-reset');
      window.dispatchEvent(evt);
    }
  };

  // handleNewSearch: reset résultats quand on démarre une création
  const handleNewSearch = () => {
    setShowForm(true);
    setSelectedSearch(null);
    resetCurrentResults();
  };

  const handleExecuteSearch = async (searchConfig: any) => {
    // On vide les résultats avant de lancer la recherche
    resetCurrentResults();
    const result = await executeSearch(searchConfig);
    setShowForm(false);
    return result;
  };

  // Exécution directe d'une recherche sauvegardée
  const handleDirectExecute = async (search: any) => {
    resetCurrentResults();
    await reRunSavedSearch(search);
  };

  const handleEditSearch = (search: any) => {
    setSelectedSearch(search);
    setShowForm(true);
    resetCurrentResults();
  };

  // Sélection d'une recherche pour afficher ses résultats
  const handleSelectSearch = (search: any) => {
    setSelectedSearch(search);
    // Vidage immédiat AVANT d'aller charger (sinon flash d'anciens jobs)
    resetCurrentResults();
    if (search?.id) {
      loadSearchResults(search.id);
    } else {
      loadSearchResults(null);
    }
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

  // Ajout : handler suppression avec reset d'état local aussi
  const handleDeleteSearch = async (searchId: string) => {
    await deleteSearch(searchId); // Effectue la suppression + reset résultats côté core
    setSelectedSearch(null);      // On s'assure de "désélectionner" s’il s’agissait de la sélection courante
    resetCurrentResults();        // <-- Ajouté ici : on nettoie aussi les résultats affichés 
  };

  // Synchroniser le reset explicit des résultats avec le state local
  useEffect(() => {
    function listener() {
      // Force le cleanup complet 
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
        // Rafraîchir résultats si une nouvelle ligne correspond à la recherche sélectionnée
        loadSearchResults(selectedSearch.id);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedSearch?.id, loadSearchResults]);

  // Si la liste des recherches change et que la recherche sélectionnée n’existe plus, on reset
  useEffect(() => {
    if (
      selectedSearch &&
      !savedSearches.some((s) => s.id === selectedSearch.id)
    ) {
      setSelectedSearch(null);
      resetCurrentResults();
    }
  }, [savedSearches, selectedSearch]);

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
          <Button onClick={handleNewSearch} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nouvelle recherche
          </Button>
        }
      />

      <div className="space-y-6">
        {/* Formulaire de recherche */}
        {showForm && (
          <SearchJobsForm
            onSubmit={handleExecuteSearch}
            onCancel={() => setShowForm(false)}
            initialData={selectedSearch}
          />
        )}

        {/* Liste des recherches sauvegardées (ajout du click pour sélection) */}
        <CompactSavedSearches
          searches={savedSearches}
          onExecute={handleDirectExecute}
          onEdit={handleEditSearch}
          onDelete={handleDeleteSearch} // Change ici !
          onLoadResults={handleLoadResults}
          // Ajout de la props onSelect (nouveau)
          onSelect={handleSelectSearch}
          selectedSearchId={selectedSearch?.id}
        />

        {/* Résultats */}
        {selectedSearch && (
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-gray-900">
                Résultats pour : <span className="text-blue-700">{selectedSearch.name}</span>
              </h3>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  resetCurrentResults();
                  loadSearchResults(selectedSearch.id)
                }}
                className="flex items-center gap-2"
                title="Rafraîchir les résultats"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Rafraîchir
              </Button>
            </div>
            <SearchResults
              results={currentResults}
              isLoading={isLoading || (!currentResults?.length && !!selectedSearch?.id)} // force loading quand SELECTED mais rien n'est arrivé
              key={selectedSearch.id}
            />
          </div>
        )}

        {/* Guide UX si aucune recherche sélectionnée */}
        {!selectedSearch && (
          <div className="text-gray-500 text-center py-16">
            <Search className="h-10 w-10 mx-auto mb-4 text-blue-300" />
            <div className="text-lg font-semibold">Cliquez sur une recherche sauvegardée pour afficher ses résultats.</div>
            <div className="text-sm mt-2">Vous pouvez exécuter une recherche, l’éditer ou voir ses résultats plus tard.</div>
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

// fin du fichier
