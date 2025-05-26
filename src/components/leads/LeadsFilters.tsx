
import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import MultiSelectFilter from './MultiSelectFilter';
import CategoryFilter from './CategoryFilter';

interface LeadsFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  selectedDateFilter: string;
  onDateFilterChange: (filter: string) => void;
}

const columnOptions = [
  { value: 'posted_date', label: 'Posted Date' },
  { value: 'job_title', label: 'Titre de poste recherché' },
  { value: 'author_name', label: 'Auteur' },
  { value: 'company', label: 'Entreprise' },
  { value: 'post_url', label: 'URL du post' },
  { value: 'status', label: 'Statut' },
  { value: 'category', label: 'Catégorie' },
  { value: 'location', label: 'Localisation' },
];

const dateFilterOptions = [
  { value: 'all', label: 'Tout le temps' },
  { value: '24h', label: 'Dernières 24h' },
  { value: '48h', label: 'Dernières 48h' },
  { value: '7d', label: 'Derniers 7 jours' },
];

// Ordered categories as requested
const availableCategories = [
  'Tech',
  'Data', 
  'Business',
  'Product',
  'Executive Search',
  'RH',
  'Comptelio',
  'Freelance'
];

const LeadsFilters = ({
  selectedCategories,
  onCategoriesChange,
  visibleColumns,
  onColumnsChange,
  selectedDateFilter,
  onDateFilterChange
}: LeadsFiltersProps) => {
  const clearFilters = () => {
    onCategoriesChange(availableCategories);
  };

  const hasActiveFilters = selectedCategories.length < availableCategories.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MultiSelectFilter
            title="Colonnes"
            options={columnOptions}
            selectedValues={visibleColumns}
            onSelectionChange={onColumnsChange}
          />
          <Select value={selectedDateFilter} onValueChange={onDateFilterChange}>
            <SelectTrigger className="w-36 h-7 text-xs">
              <SelectValue placeholder="Période" />
            </SelectTrigger>
            <SelectContent>
              {dateFilterOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 w-7 p-0 hover:bg-gray-100"
            >
              <X className="h-3 w-3" />
            </Button>
          )}
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
