import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MultiSelectFilter from './MultiSelectFilter';
import { Users } from 'lucide-react';

interface CompanyFiltersProps {
  selectedCompanyCategories: string[];
  setSelectedCompanyCategories: (categories: string[]) => void;
  minEmployees: string;
  setMinEmployees: (value: string) => void;
  maxEmployees: string;
  setMaxEmployees: (value: string) => void;
  availableCompanyCategories: string[];
}

export default function CompanyFilters({
  selectedCompanyCategories,
  setSelectedCompanyCategories,
  minEmployees,
  setMinEmployees,
  maxEmployees,
  setMaxEmployees,
  availableCompanyCategories
}: CompanyFiltersProps) {
  
  const clearEmployeeFilters = () => {
    setMinEmployees('');
    setMaxEmployees('');
  };

  // Transform categories for MultiSelectFilter format
  const categoryOptions = availableCompanyCategories.map(category => ({
    value: category,
    label: category
  }));

  return (
    <div className="flex items-center gap-3">
      {/* Company Categories Exclusion Filter */}
      {availableCompanyCategories.length > 0 && (
        <MultiSelectFilter
          title="Exclure secteurs"
          options={categoryOptions}
          selectedValues={selectedCompanyCategories}
          onSelectionChange={setSelectedCompanyCategories}
          singleSelect={false}
        />
      )}

      {/* Employee Count Range - styled like other filters */}
      <div className="flex items-center gap-2 h-8 px-2 bg-gray-50 border-0 border-b border-gray-200 rounded-none shadow-none">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="font-medium text-gray-700 text-sm">Employés:</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min"
            value={minEmployees}
            onChange={(e) => setMinEmployees(e.target.value)}
            className="h-6 w-20 text-xs bg-gray-100 border-0 focus:ring-0 appearance-none"
            style={{ MozAppearance: 'textfield' }}
            min="0"
          />
          <span className="text-xs text-gray-400">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            className="h-6 w-20 text-xs bg-gray-100 border-0 focus:ring-0 appearance-none"
            style={{ MozAppearance: 'textfield' }}
            min="0"
          />
          {(minEmployees || maxEmployees) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearEmployeeFilters}
              className="h-6 px-1 text-xs text-gray-500 hover:text-gray-700 ml-1"
            >
              ×
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
