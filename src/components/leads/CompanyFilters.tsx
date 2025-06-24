
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Building2, Users } from 'lucide-react';

interface CompanyFiltersProps {
  selectedCompanyCategories: string[];
  setSelectedCompanyCategories: (categories: string[]) => void;
  minEmployees: string;
  setMinEmployees: (value: string) => void;
  maxEmployees: string;
  setMaxEmployees: (value: string) => void;
  availableCompanyCategories: string[];
}

const categoryColors = {
  'Tech': 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-150',
  'Finance': 'bg-green-100 border-green-300 text-green-800 hover:bg-green-150',
  'Healthcare': 'bg-red-100 border-red-300 text-red-800 hover:bg-red-150',
  'Education': 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-150',
  'Retail': 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-150',
  'Manufacturing': 'bg-orange-100 border-orange-300 text-orange-800 hover:bg-orange-150',
  'Services': 'bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-150',
  'Media': 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-150',
  'Energy': 'bg-teal-100 border-teal-300 text-teal-800 hover:bg-teal-150'
};

export default function CompanyFilters({
  selectedCompanyCategories,
  setSelectedCompanyCategories,
  minEmployees,
  setMinEmployees,
  maxEmployees,
  setMaxEmployees,
  availableCompanyCategories
}: CompanyFiltersProps) {
  const toggleCompanyCategory = (category: string) => {
    if (selectedCompanyCategories.includes(category)) {
      setSelectedCompanyCategories(selectedCompanyCategories.filter(cat => cat !== category));
    } else {
      setSelectedCompanyCategories([...selectedCompanyCategories, category]);
    }
  };

  const clearEmployeeFilters = () => {
    setMinEmployees('');
    setMaxEmployees('');
  };

  return (
    <div className="space-y-3">
      {/* Company Categories */}
      {availableCompanyCategories.length > 0 && (
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <Building2 className="h-4 w-4" />
            Secteur:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {availableCompanyCategories.map((category) => {
              const isSelected = selectedCompanyCategories.includes(category);
              const colorClass = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-150';
              const finalColorClass = isSelected ? colorClass : 'bg-gray-100 border-gray-300 text-gray-400 hover:bg-gray-150';
              
              return (
                <Badge
                  key={category}
                  variant="outline"
                  className={`text-xs px-2 py-0.5 h-6 cursor-pointer transition-colors border ${finalColorClass}`}
                  onClick={() => toggleCompanyCategory(category)}
                >
                  {category}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* Employee Count Range */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
          <Users className="h-4 w-4" />
          Employés:
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="number"
            placeholder="Min"
            value={minEmployees}
            onChange={(e) => setMinEmployees(e.target.value)}
            className="h-6 w-20 text-xs"
            min="0"
          />
          <span className="text-xs text-gray-400">à</span>
          <Input
            type="number"
            placeholder="Max"
            value={maxEmployees}
            onChange={(e) => setMaxEmployees(e.target.value)}
            className="h-6 w-20 text-xs"
            min="0"
          />
          {(minEmployees || maxEmployees) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearEmployeeFilters}
              className="h-6 px-2 text-xs text-gray-500 hover:text-gray-700"
            >
              Effacer
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
