
import MultiSelectFilter from './MultiSelectFilter';
import CompanyFilters from './CompanyFilters';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, Grid3X3, Search } from 'lucide-react';
import { useUserRole } from '@/hooks/useUserRole';

interface LeadsFiltersProps {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedContactFilter?: string;
  setSelectedContactFilter?: (filter: string) => void;
  selectedCompanyCategories?: string[];
  setSelectedCompanyCategories?: (categories: string[]) => void;
  minEmployees?: string;
  setMinEmployees?: (value: string) => void;
  maxEmployees?: string;
  setMaxEmployees?: (value: string) => void;
  availableCategories: string[];
  availableCompanyCategories?: string[];
  showContactFilter?: boolean;
  showAssignmentColumn?: boolean;
  viewMode: 'table' | 'card';
  setViewMode: (mode: 'table' | 'card') => void;
  searchQuery?: string;
  setSearchQuery?: (query: string) => void;
  isAdmin?: boolean;
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
  { value: 'only_my_contacts', label: 'Mes contacts uniquement' },
];

// Catégories visibles pour tous les utilisateurs (sans "Autre")
const allCategories = [
  'Tech',
  'Business', 
  'Product',
  'Executive Search',
  'Comptelio',
  'RH',
  'Freelance',
  'Data'
];

const categoryColors = {
  'Tech': {
    active: 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'Business': {
    active: 'bg-green-100 border-green-300 text-green-800 hover:bg-green-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'Product': {
    active: 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'Executive Search': {
    active: 'bg-red-100 border-red-300 text-red-800 hover:bg-red-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'Comptelio': {
    active: 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'RH': {
    active: 'bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'Freelance': {
    active: 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  },
  'Data': {
    active: 'bg-teal-100 border-teal-300 text-teal-800 hover:bg-teal-150',
    inactive: 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150'
  }
};

export default function LeadsFilters({ 
  selectedCategories, 
  setSelectedCategories,
  selectedDateFilter,
  setSelectedDateFilter,
  selectedContactFilter,
  setSelectedContactFilter,
  selectedCompanyCategories = [],
  setSelectedCompanyCategories,
  minEmployees = '',
  setMinEmployees,
  maxEmployees = '',
  setMaxEmployees,
  availableCategories,
  availableCompanyCategories = [],
  showContactFilter = true,
  showAssignmentColumn = false,
  viewMode,
  setViewMode,
  searchQuery = '',
  setSearchQuery,
  isAdmin = false
}: LeadsFiltersProps) {
  const { isAdmin: userIsAdmin } = useUserRole();

  // Use the passed isAdmin prop or fall back to the hook
  const effectiveIsAdmin = isAdmin || userIsAdmin;

  // Afficher seulement les catégories standard (sans "Autre" pour tous les utilisateurs)
  const categoriesToShow = allCategories;

  const toggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter(cat => cat !== category));
    } else {
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-3">
      {/* Top row with all filters and view toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <MultiSelectFilter
            title="Période"
            options={dateFilterOptions}
            selectedValues={[selectedDateFilter]}
            onSelectionChange={(values) => setSelectedDateFilter(values[0] || '7days')}
            singleSelect={true}
          />

          {showContactFilter && selectedContactFilter && setSelectedContactFilter && (
            <MultiSelectFilter
              title="Statut de contact"
              options={contactFilterOptions}
              selectedValues={[selectedContactFilter]}
              onSelectionChange={(values) => setSelectedContactFilter(values[0] || 'exclude_2weeks')}
              singleSelect={true}
            />
          )}

          {/* Company Filters - now inline with other filters */}
          <CompanyFilters
            selectedCompanyCategories={selectedCompanyCategories}
            setSelectedCompanyCategories={setSelectedCompanyCategories || (() => {})}
            minEmployees={minEmployees}
            setMinEmployees={setMinEmployees || (() => {})}
            maxEmployees={maxEmployees}
            setMaxEmployees={setMaxEmployees || (() => {})}
            availableCompanyCategories={availableCompanyCategories}
          />

          {/* Barre de recherche */}
          {setSearchQuery && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-8 w-64 text-sm"
              />
            </div>
          )}
        </div>

        {/* Table/Card View Toggle - Sans encadré et plus compact */}
        <div className="flex gap-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('table')}
            className="h-7 px-3 text-sm"
          >
            <Table className="h-4 w-4 mr-1" />
            Tableau
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('card')}
            className="h-7 px-3 text-sm"
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Cartes
          </Button>
        </div>
      </div>
      
      {/* Lead Categories badges row */}
      <div className="flex flex-wrap gap-1.5">
        {categoriesToShow.map((category) => {
          const isSelected = selectedCategories.includes(category);
          const colors = categoryColors[category as keyof typeof categoryColors];
          const colorClass = isSelected ? colors.active : colors.inactive;
          
          return (
            <Badge
              key={category}
              variant="outline"
              className={`text-xs px-2 py-0.5 h-6 cursor-pointer transition-colors border ${colorClass}`}
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
