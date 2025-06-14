
import { useState } from 'react';
import { useSearchJobs } from '@/hooks/useSearchJobs';
import GlobalPageHeader from '@/components/GlobalPageHeader';
import PageLayout from '@/components/PageLayout';
import { SearchJobsForm } from '@/components/search-jobs/SearchJobsForm';
import { SavedSearches } from '@/components/search-jobs/SavedSearches';
import { SearchResults } from '@/components/search-jobs/SearchResults';
import { FloatingActionButton } from '@/components/ui/floating-action-button';
import { Search, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SearchJobs = () => {
  const {
    savedSearches,
    currentResults,
    isLoading,
    executeSearch,
    deleteSearch,
    loadSearchResults
  } = useSearchJobs();

  const [showForm, setShowForm] = useState(false);
  const [selectedSearch, setSelectedSearch] = useState<any>(null);

  const handleNewSearch = () => {
    setShowForm(true);
    setSelectedSearch(null);
  };

  const handleExecuteSearch = async (searchConfig: any) => {
    const result = await executeSearch(searchConfig);
    setShowForm(false);
    return result;
  };

  const handleDirectExecute = async (search: any) => {
    // Convertir la recherche sauvegardée en format attendu par executeSearch
    const searchConfig = {
      name: search.name,
      search_jobs: search.jobFilters,
      personna_filters: search.personaFilters,
      message_template: search.messageTemplate,
      saveOnly: false
    };
    
    await executeSearch(searchConfig);
  };

  const handleEditSearch = (search: any) => {
    setSelectedSearch(search);
    setShowForm(true);
  };

  const handleLoadResults = (searchId: string) => {
    loadSearchResults(searchId);
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

        {/* Recherches sauvegardées */}
        <SavedSearches
          searches={savedSearches}
          onExecute={handleDirectExecute}
          onEdit={handleEditSearch}
          onDelete={deleteSearch}
          onLoadResults={handleLoadResults}
        />

        {/* Résultats */}
        <SearchResults
          results={currentResults}
          isLoading={isLoading}
        />
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
