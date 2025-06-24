
import React, { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import MultiSelectFilter from './MultiSelectFilter';
import { Building2, Users, X, RotateCcw } from 'lucide-react';

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

  const clearAllSectorFilters = () => {
    setSelectedCompanyCategories([]);
  };

  const resetToDefaultSectorFilters = () => {
    const recruitmentCategories = availableCompanyCategories.filter(cat => 
      cat.toLowerCase().includes('recrutement') || 
      cat.toLowerCase().includes('recruitment') ||
      cat.toLowerCase().includes('cabinet')
    );
    setSelectedCompanyCategories(recruitmentCategories);
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
        <div className="flex items-center gap-2">
          <MultiSelectFilter
            title="Exclure secteurs"
            options={categoryOptions}
            selectedValues={selectedCompanyCategories}
            onSelectionChange={setSelectedCompanyCategories}
            singleSelect={false}
          />
          {selectedCompanyCategories.length > 0 && (
            <div className="flex items-center gap-1">
              <X className="h-3 w-3 text-red-500" />
              <span className="text-xs text-red-600 font-medium">
                {selectedCompanyCategories.length} exclus
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllSectorFilters}
                className="h-5 px-1 text-xs text-gray-500 hover:text-gray-700 ml-1"
                title="Enlever tous les filtres d'exclusion"
              >
                ×
              </Button>
            </div>
          )}
          {selectedCompanyCategories.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetToDefaultSectorFilters}
              className="h-6 px-2 text-xs text-blue-600 hover:text-blue-800"
              title="Remettre l'exclusion par défaut (cabinets de recrutement)"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Défaut
            </Button>
          )}
        </div>
      )}

      {/* Employee Count Range - styled like other filters */}
      <div className="flex items-center gap-2 h-8 px-3 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 ease-in-out">
        <Users className="h-4 w-4 text-gray-600" />
        <span className="font-medium text-gray-700 text-sm">Employés:</span>
        <div className="flex items-center gap-1">
          <Input
            type="number"
            placeholder="Min"
            value={minEmployees}
            onChange={(e) => setMinEmployees(e.target.value)}
            className="h-6 w-16 text-xs border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            min="0"
          />
          <span className="text-xs text-gray-400">-</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            className="h-6 w-16 text-xs border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
