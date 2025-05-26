
import React from 'react';
import { Button } from '@/components/ui/button';
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
  { value: 'author_name', label: 'Prénom et Nom' },
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
  onDateFilterChange
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
            <SelectTrigger className="w-40 h-8">
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
