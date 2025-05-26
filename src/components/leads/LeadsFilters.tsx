
import React from 'react';
import { Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MultiSelectFilter from './MultiSelectFilter';
import CategoryFilter from './CategoryFilter';

interface LeadsFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  onExport: () => void;
}

const availableCategories = [
  'Tech',
  'Business',
  'Product',
  'Executive Search',
  'Comptelio',
  'RH',
  'Freelance',
  'Data',
  'Autre'
];

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

const LeadsFilters = ({
  selectedCategories,
  onCategoriesChange,
  visibleColumns,
  onColumnsChange,
  onExport
}: LeadsFiltersProps) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          <span className="font-medium">Tableau des leads</span>
        </div>
        <div className="flex items-center gap-3">
          <MultiSelectFilter
            title="Colonnes"
            options={columnOptions}
            selectedValues={visibleColumns}
            onSelectionChange={onColumnsChange}
          />
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-8"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
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
