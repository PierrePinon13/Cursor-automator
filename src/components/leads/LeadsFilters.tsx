
import React from 'react';
import { Download, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import MultiSelectFilter from './MultiSelectFilter';

interface LeadsFiltersProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
  onExport: () => void;
}

const categoryOptions = [
  { value: 'Tech', label: 'Tech' },
  { value: 'Business', label: 'Business' },
  { value: 'Product', label: 'Product' },
  { value: 'Executive Search', label: 'Executive Search' },
  { value: 'Comptelio', label: 'Comptelio' },
  { value: 'RH', label: 'RH' },
  { value: 'Freelance', label: 'Freelance' },
  { value: 'Data', label: 'Data' },
  { value: 'Autre', label: 'Autre' },
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
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Filter className="h-5 w-5" />
        <span className="font-medium">Tableau des leads</span>
      </div>
      <div className="flex items-center gap-3">
        <MultiSelectFilter
          title="Catégories"
          options={categoryOptions}
          selectedValues={selectedCategories}
          onSelectionChange={onCategoriesChange}
        />
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
  );
};

export default LeadsFilters;
