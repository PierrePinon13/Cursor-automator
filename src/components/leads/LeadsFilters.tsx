
import React from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, Grid } from 'lucide-react';
import MultiSelectFilter from './MultiSelectFilter';
import CategoryFilter from './CategoryFilter';

interface LeadsFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  selectedDateFilter: string;
  onDateFilterChange: (filter: string) => void;
  viewMode: 'table' | 'card';
  onViewModeChange: (mode: 'table' | 'card') => void;
}

const columnOptions = [
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'job_title', label: 'Titre de poste recherché' },
  { value: 'author_name', label: 'Prénom et Nom' },
  { value: 'company', label: 'Entreprise' },
  { value: 'post_url', label: 'URL du post' },
  { value: 'status', label: 'Statut' },
  { value: 'category', label: 'Catégorie' },
  { value: 'location', label: 'Localisation' },
];

const dateFilterOptions = [
  { value: '24h', label: 'Dernières 24h' },
  { value: '48h', label: 'Dernières 48h' },
  { value: '7days', label: '7 derniers jours' },
  { value: 'all', label: 'Tous' },
];

// Get available categories from useLeads hook
const availableCategories = [
  'Tech',
  'Business',
  'Product',
  'Executive Search',
  'Comptelio',
  'RH',
  'Freelance',
  'Data'
];

const LeadsFilters = ({
  selectedCategories,
  onCategoriesChange,
  visibleColumns,
  onColumnsChange,
  selectedDateFilter,
  onDateFilterChange,
  viewMode,
  onViewModeChange
}: LeadsFiltersProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MultiSelectFilter
            title="Colonnes"
            options={columnOptions}
            selectedValues={visibleColumns}
            onSelectionChange={onColumnsChange}
          />
          <Select value={selectedDateFilter} onValueChange={onDateFilterChange}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue placeholder="Filtrer par date" />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('table')}
            className="h-7 px-3"
          >
            <Table className="h-3 w-3 mr-1" />
            Tableau
          </Button>
          <Button
            variant={viewMode === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onViewModeChange('card')}
            className="h-7 px-3"
          >
            <Grid className="h-3 w-3 mr-1" />
            Cartes
          </Button>
        </div>
      </div>
      
      <CategoryFilter
        selectedCategories={selectedCategories}
        onCategoriesChange={onCategoriesChange}
        availableCategories={availableCategories}
      />
    </div>
  );
};

export default LeadsFilters;
