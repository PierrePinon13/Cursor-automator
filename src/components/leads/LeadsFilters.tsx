
import MultiSelectFilter from './MultiSelectFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, Grid3X3 } from 'lucide-react';

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
  viewMode: 'table' | 'card';
  setViewMode: (mode: 'table' | 'card') => void;
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

const categoryColors = {
  'Tech': {
    active: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'Business': {
    active: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'Product': {
    active: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'Executive Search': {
    active: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'Comptelio': {
    active: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'RH': {
    active: 'bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'Freelance': {
    active: 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  },
  'Data': {
    active: 'bg-teal-100 border-teal-300 text-teal-800 hover:bg-teal-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
  }
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
  showAssignmentColumn = false,
  viewMode,
  setViewMode
}: LeadsFiltersProps) {
  const columnOptions = getColumnOptions(showAssignmentColumn);

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top row with filters and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MultiSelectFilter
            title="Colonnes"
            options={columnOptions}
            selectedValues={visibleColumns}
            onSelectionChange={setVisibleColumns}
          />

          <MultiSelectFilter
            title="Période"
            options={dateFilterOptions}
            selectedValues={[selectedDateFilter]}
            onSelectionChange={(values) => setSelectedDateFilter(values[0] || '7days')}
          />

          {showContactFilter && selectedContactFilter && setSelectedContactFilter && (
            <MultiSelectFilter
              title="Statut de contact"
              options={contactFilterOptions}
              selectedValues={[selectedContactFilter]}
              onSelectionChange={(values) => setSelectedContactFilter(values[0] || 'exclude_2weeks')}
            />
          )}
        </div>

        {/* Table/Card View Toggle */}
        <div className="flex rounded-lg border border-gray-200 bg-white p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
          >
            <Table className="h-4 w-4" />
            Tableau
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
          >
            <Grid3X3 className="h-4 w-4" />
            Cartes
          </Button>
        </div>
      </div>
      
      {/* Categories badges row */}
      <div className="flex flex-wrap gap-2">
        {availableCategories.map((category) => {
          const isSelected = selectedCategories.includes(category);
          const colors = categoryColors[category as keyof typeof categoryColors] || {
            active: 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-150',
            inactive: 'bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-150'
          };
          const colorClass = isSelected ? colors.active : colors.inactive;
          
          return (
            <Badge
              key={category}
              variant="outline"
              className={`text-xs px-2 py-1 cursor-pointer transition-colors border ${colorClass}`}
              onClick={() => toggleCategory(category)}
            >
              {category}
            </Badge>
          );
        })}
      </div>
    </div>
  );
}
