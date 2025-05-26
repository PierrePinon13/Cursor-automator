
import React from 'react';
import { Button } from '@/components/ui/button';

interface CategoryFilterProps {
  selectedCategories: string[];
  onCategoriesChange: (categories: string[]) => void;
  availableCategories: string[];
}

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
      <span className="text-sm font-medium text-gray-700">Catégories:</span>
      
      {availableCategories.map((category) => {
        const isSelected = selectedCategories.includes(category);
        return (
          <Button
            key={category}
            variant="outline"
            size="sm"
            onClick={() => handleToggleCategory(category)}
            className={`h-8 text-xs transition-all ${
              isSelected 
                ? 'bg-blue-100 border-blue-300 text-blue-800 hover:bg-blue-200' 
                : 'bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100'
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
          className="h-8 text-xs text-blue-600 hover:text-blue-800"
        >
          Tout sélectionner
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          className="h-8 text-xs text-gray-600 hover:text-gray-800"
        >
          Tout effacer
        </Button>
      </div>
    </div>
  );
};

export default CategoryFilter;
