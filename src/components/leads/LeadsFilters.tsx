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
  visibleColumns?: string[];
  setVisibleColumns?: (columns: string[]) => void;
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
  visibleColumns = [],
  setVisibleColumns,
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
      {/* 2. Ligne de filtres : 4 filtres largeur limitée + catégories métiers à la suite */}
      <div className="flex items-center gap-x-3 gap-y-0 flex-nowrap w-full mt-1 mb-0 overflow-x-auto min-w-0">
        <div className="flex items-center gap-1 h-8 px-2 bg-gray-50 border-0 rounded-none shadow-none min-w-[110px] max-w-[130px] w-auto hover:bg-gray-50 transition-colors">
          <MultiSelectFilter
            title="Période"
            options={dateFilterOptions}
            selectedValues={[selectedDateFilter]}
            onSelectionChange={(values) => setSelectedDateFilter(values[0] || '7days')}
            singleSelect={true}
            hideChevron={false}
            highlightActive={selectedDateFilter !== '7days'}
          />
        </div>
        {showContactFilter && selectedContactFilter && setSelectedContactFilter && (
          <div className="flex items-center gap-1 h-8 px-2 bg-gray-50 border-0 rounded-none shadow-none min-w-[140px] max-w-[180px] w-auto hover:bg-gray-50 transition-colors">
            <MultiSelectFilter
              title="Statut de contact"
              options={contactFilterOptions}
              selectedValues={[selectedContactFilter]}
              onSelectionChange={(values) => setSelectedContactFilter(values[0] || 'exclude_2weeks')}
              singleSelect={true}
              highlightActive={selectedContactFilter !== 'exclude_2weeks'}
            />
          </div>
        )}
        {/* Exclure secteurs */}
        {availableCompanyCategories.length > 0 && (
          <div className="flex items-center gap-1 h-8 px-2 bg-gray-50 border-0 rounded-none shadow-none min-w-[140px] max-w-[180px] w-auto hover:bg-gray-50 transition-colors">
            <MultiSelectFilter
              title="Exclure secteurs"
              options={availableCompanyCategories.map(category => ({ value: category, label: category }))}
              selectedValues={selectedCompanyCategories}
              onSelectionChange={setSelectedCompanyCategories}
              singleSelect={false}
              highlightActive={selectedCompanyCategories.length > 0}
            />
          </div>
        )}
        {/* Employés */}
        <div className="flex items-center gap-1 h-8 px-2 bg-gray-50 border-0 rounded-none shadow-none min-w-[140px] max-w-[180px] w-auto hover:bg-gray-50 transition-colors">
          <span className="font-medium text-gray-700 text-xs">Employés:</span>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              placeholder="Min"
              value={minEmployees}
              onChange={(e) => setMinEmployees(e.target.value)}
              className="h-6 w-[70px] text-xs bg-gray-100 border-0 focus:ring-0 appearance-none text-center"
              style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
              onWheel={e => e.currentTarget.blur()}
              min="0"
            />
            <span className="text-xs text-gray-400">-</span>
            <Input
              type="number"
              placeholder="Max"
              value={maxEmployees}
              onChange={(e) => setMaxEmployees(e.target.value)}
              className="h-6 w-[70px] text-xs bg-gray-100 border-0 focus:ring-0 appearance-none text-center"
              style={{ MozAppearance: 'textfield', appearance: 'textfield' }}
              onWheel={e => e.currentTarget.blur()}
              min="0"
            />
            {(minEmployees || maxEmployees) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { setMinEmployees(''); setMaxEmployees(''); }}
                className="h-6 px-1 text-xs text-gray-500 hover:text-gray-700 ml-1"
              >
                ×
              </Button>
            )}
          </div>
        </div>
        {/* Espace explicite entre Employés et catégories métiers */}
        <div className="w-6" />
        {/* Catégories métiers à la suite */}
        <div className="flex flex-nowrap gap-1 flex-shrink-0 items-center">
          {categoriesToShow.map((category) => {
            const isSelected = selectedCategories.includes(category);
            const colors = categoryColors[category as keyof typeof categoryColors];
            const colorClass = isSelected ? colors.active : colors.inactive;
            return (
              <Badge
                key={category}
                variant="outline"
                className={`text-xs px-2 h-5 font-normal cursor-pointer transition-colors border ${colorClass}`}
                onClick={() => toggleCategory(category)}
              >
                {category}
              </Badge>
            );
          })}
        </div>
      </div>
      {/* Ligne très fine sous tous les filtres */}
      <div className="w-full border-b border-gray-100" />
    </div>
  );
}
