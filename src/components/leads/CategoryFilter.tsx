
import React from 'react';
import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  availableCategories: string[];
}

const categoryColors = {
  'Tech': 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200',
  'Business': 'bg-green-100 border-green-300 text-green-800 hover:bg-green-200',
  'Product': 'bg-purple-100 border-purple-300 text-purple-800 hover:bg-purple-200',
  'Executive Search': 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200',
  'Comptelio': 'bg-yellow-100 border-yellow-300 text-yellow-800 hover:bg-yellow-200',
  'RH': 'bg-pink-100 border-pink-300 text-pink-800 hover:bg-pink-200',
  'Freelance': 'bg-indigo-100 border-indigo-300 text-indigo-800 hover:bg-indigo-200',
  'Data': 'bg-teal-100 border-teal-300 text-teal-800 hover:bg-teal-200'
};

const CategoryFilter = ({
  selectedCategories,
  onCategoriesChange,
  availableCategories
}: CategoryFilterProps) => {
  const handleToggleCategory = (category: string) => {
    if (selectedCategories.includes(category)) {
      onCategoriesChange(selectedCategories.filter(c => c !== category));
    } else {
      onCategoriesChange([...selectedCategories, category]);
    }
  };

  const handleSelectAll = () => {
    onCategoriesChange(availableCategories);
  };

  const handleClearAll = () => {
    onCategoriesChange([]);
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {availableCategories.map((category) => {
        const isSelected = selectedCategories.includes(category);
        const colorClass = categoryColors[category as keyof typeof categoryColors] || 'bg-gray-100 border-gray-300 text-gray-800 hover:bg-gray-200';
        
        return (
          <Button
            key={category}
            variant="outline"
            size="sm"
            onClick={() => handleToggleCategory(category)}
            className={`h-6 text-xs transition-all ${
              isSelected 
                ? colorClass
                : 'bg-gray-50 border-gray-200 text-gray-300 hover:bg-gray-100'
            }`}
          >
            {category}
          </Button>
        );
      })}
      
      <div className="flex gap-1 ml-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSelectAll}
          className="h-6 text-xs text-blue-600 hover:text-blue-800"
        >
          Tout sélectionner
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-6 text-xs text-gray-600 hover:text-gray-800"
        >
          Tout effacer
        </Button>
      </div>
    </div>
  );
};

export default CategoryFilter;
