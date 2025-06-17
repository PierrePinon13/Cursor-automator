import { useEffect, useState } from 'react';
import { useSearchJobs } from '@/hooks/useSearchJobs';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { SearchJobsForm } from '@/components/search-jobs/SearchJobsForm';
import { CompactSavedSearches } from '@/components/search-jobs/CompactSavedSearches';
import { SearchResults } from '@/components/search-jobs/SearchResults';
import { ContactsOverview } from '@/components/search-jobs/ContactsOverview';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Search, Plus, RefreshCw, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  const [showContactsOverview, setShowContactsOverview] = useState(false);

  // Reset explicite des résultats
  const resetCurrentResults = () => {
    if (typeof window !== "undefined") {
      const evt = new CustomEvent('job-results-reset');
      window.dispatchEvent(evt);
    }
  };

  const handleNewSearch = () => {
    setShowForm(true);
    setSelectedSearch(null);
    resetCurrentResults();
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

  // Calculer le nombre total de contacts
  const totalContacts = currentResults?.reduce((acc, job) => acc + (job.personas?.length || 0), 0) || 0;

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
          <div className="flex items-center gap-2">
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
            onCancel={() => setShowForm(false)}
            initialData={selectedSearch}
          />
        )}

        {/* Recherches sauvegardées - Toujours visible et développée par défaut */}
        {savedSearches.length > 0 && (
          <CompactSavedSearches
            searches={savedSearches}
            onExecute={handleDirectExecute}
            onEdit={handleEditSearch}
            onDelete={handleDeleteSearch}
            onLoadResults={handleLoadResults}
            onSelect={handleSelectSearch}
            selectedSearchId={selectedSearch?.id}
          />
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

        {/* Résultats avec bouton de prospection volumique bien visible */}
        {selectedSearch && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
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
              
              {/* BOUTON DE PROSPECTION VOLUMIQUE BIEN VISIBLE */}
              {totalContacts > 0 && (
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {totalContacts} contact{totalContacts > 1 ? 's' : ''} trouvé{totalContacts > 1 ? 's' : ''}
                  </Badge>
                  <Button 
                    onClick={() => setShowContactsOverview(true)}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Users className="h-4 w-4" />
                    Prospection volumique
                  </Button>
                </div>
              )}
            </div>
            
            <SearchResults
              results={currentResults}
              isLoading={isLoading || (!currentResults?.length && !!selectedSearch?.id)}
              key={`search-results-${selectedSearch.id}-${currentResults?.length || 0}`}
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

      {/* Modal d'aperçu des contacts */}
      {showContactsOverview && selectedSearch && currentResults && (
        <ContactsOverview
          searchResults={currentResults}
          searchName={selectedSearch.name}
          isOpen={showContactsOverview}
          onClose={() => setShowContactsOverview(false)}
        />
      )}
    </PageLayout>
  );
};

export default SearchJobs;
