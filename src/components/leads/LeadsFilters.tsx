
import MultiSelectFilter from './MultiSelectFilter';
import SavedViewsButton from './SavedViewsButton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

interface LeadsFiltersProps {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedContactFilter?: string;
  setSelectedContactFilter?: (filter: string) => void;
  availableCategories: string[];
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  showContactFilter?: boolean;
  showAssignmentColumn?: boolean;
}

const dateFilterOptions = [
  { value: '24h', label: 'Dernières 24h' },
  { value: '48h', label: 'Dernières 48h' },
  { value: '7days', label: 'Derniers 7 jours' },
  { value: 'all', label: 'Tout' },
];

const contactFilterOptions = [
  { value: 'exclude_none', label: 'Inclure tous' },
  { value: 'exclude_1week', label: 'Exclure contactés (1 semaine)' },
  { value: 'exclude_2weeks', label: 'Exclure contactés (2 semaines)' },
  { value: 'exclude_1month', label: 'Exclure contactés (1 mois)' },
  { value: 'exclude_all_contacted', label: 'Exclure tous contactés' },
];

const getColumnOptions = (showAssignmentColumn = false) => {
  const baseColumns = [
    { value: 'author_name', label: 'Auteur' },
    { value: 'author_headline', label: 'Titre' },
    { value: 'unipile_company', label: 'Entreprise' },
    { value: 'unipile_position', label: 'Poste' },
    { value: 'openai_step3_categorie', label: 'Catégorie' },
    { value: 'openai_step2_localisation', label: 'Localisation' },
    { value: 'posted_at', label: 'Date de publication' },
    { value: 'phone_number', label: 'Téléphone' },
    { value: 'approach_message', label: 'Message d\'approche' },
    { value: 'contact_status', label: 'Statut contact' },
    { value: 'matched_client_name', label: 'Client correspondant' },
  ];

  if (showAssignmentColumn) {
    baseColumns.push({ value: 'assignment', label: 'Assignation' });
  }

  return baseColumns;
};

export default function LeadsFilters({ 
  selectedCategories, 
  setSelectedCategories,
  selectedDateFilter,
  setSelectedDateFilter,
  selectedContactFilter,
  setSelectedContactFilter,
  availableCategories,
  visibleColumns,
  setVisibleColumns,
  showContactFilter = true,
  showAssignmentColumn = false
}: LeadsFiltersProps) {
  const columnOptions = getColumnOptions(showAssignmentColumn);

  const handleApplyView = (view: {
    selectedCategories: string[];
    visibleColumns: string[];
    selectedDateFilter: string;
    selectedContactFilter: string;
    viewMode: 'table' | 'card';
  }) => {
    setSelectedCategories(view.selectedCategories);
    setVisibleColumns(view.visibleColumns);
    setSelectedDateFilter(view.selectedDateFilter);
    if (setSelectedContactFilter) {
      setSelectedContactFilter(view.selectedContactFilter);
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    setSelectedCategories(selectedCategories.filter(cat => cat !== categoryToRemove));
  };

  const clearAllCategories = () => {
    setSelectedCategories([]);
  };

  const selectAllCategories = () => {
    setSelectedCategories(availableCategories);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Filtres</h2>
        <SavedViewsButton
          selectedCategories={selectedCategories}
          visibleColumns={visibleColumns}
          selectedDateFilter={selectedDateFilter}
          selectedContactFilter={selectedContactFilter || 'exclude_2weeks'}
          viewMode="table"
          onApplyView={handleApplyView}
        />
      </div>
      
      <div className="space-y-4">
        {/* Section catégories avec chips */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">Catégories</label>
            <div className="flex gap-2">
              {selectedCategories.length !== availableCategories.length && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                  onClick={selectAllCategories}
                >
                  Tout sélectionner
                </Button>
              )}
              {selectedCategories.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-gray-600 hover:text-gray-800"
                  onClick={clearAllCategories}
                >
                  Tout effacer
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <Badge
                key={category}
                variant="secondary"
                className="bg-blue-100 text-blue-800 border border-blue-200 px-3 py-1 cursor-pointer hover:bg-blue-200 transition-colors"
              >
                {category}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto w-auto p-0 ml-2 hover:bg-transparent"
                  onClick={() => removeCategory(category)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
            {selectedCategories.length === 0 && (
              <span className="text-sm text-gray-500 italic">Aucune catégorie sélectionnée</span>
            )}
          </div>
        </div>

        {/* Filtres période et colonnes visibles */}
        <div className="flex flex-wrap items-center gap-3">
          <MultiSelectFilter
            title="Période"
            options={dateFilterOptions}
            selectedValues={[selectedDateFilter]}
            onSelectionChange={(values) => setSelectedDateFilter(values[0] || '7days')}
          />

          <MultiSelectFilter
            title="Colonnes visibles"
            options={columnOptions}
            selectedValues={visibleColumns}
            onSelectionChange={setVisibleColumns}
          />
        </div>

        {/* Filtre de contact si affiché */}
        {showContactFilter && selectedContactFilter && setSelectedContactFilter && (
          <div className="flex items-center">
            <MultiSelectFilter
              title="Statut de contact"
              options={contactFilterOptions}
              selectedValues={[selectedContactFilter]}
              onSelectionChange={(values) => setSelectedContactFilter(values[0] || 'exclude_2weeks')}
            />
          </div>
        )}
      </div>
    </div>
  );
}
