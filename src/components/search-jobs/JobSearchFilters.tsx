
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, ChevronDown } from 'lucide-react';
import { LocationSelector } from './LocationSelector';

interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

interface JobSearchFiltersProps {
  filters: {
    keywords: string;
    location: SelectedLocation[];
    date_posted: string;
    category?: string | string[];
  };
  onChange: (filters: any) => void;
}

export const JobSearchFilters = ({ filters, onChange }: JobSearchFiltersProps) => {
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsList, setKeywordsList] = useState<string[]>(
    filters.keywords ? filters.keywords.split(',').map(k => k.trim()).filter(k => k) : []
  );
  const [categoryOpen, setCategoryOpen] = useState(false);

  const categories = [
    'Comptelio',
    'RH', 
    'Product',
    'Tech',
    'Marketing',
    'Commercial',
    'Finance',
    'Autre'
  ];

  const dateOptions = [
    { value: 'all', label: 'Toutes les dates' },
    { value: '1', label: 'Dernières 24h' },
    { value: '7', label: 'Dernière semaine' },
    { value: '30', label: 'Dernier mois' }
  ];

  const addKeyword = () => {
    const trimmedKeyword = keywordInput.trim();
    if (trimmedKeyword && !keywordsList.includes(trimmedKeyword)) {
      const newKeywords = [...keywordsList, trimmedKeyword];
      setKeywordsList(newKeywords);
      updateKeywords(newKeywords);
      setKeywordInput('');
    }
  };

  const removeKeyword = (keywordToRemove: string) => {
    const newKeywords = keywordsList.filter(k => k !== keywordToRemove);
    setKeywordsList(newKeywords);
    updateKeywords(newKeywords);
  };

  const updateKeywords = (keywords: string[]) => {
    onChange({
      ...filters,
      keywords: keywords.join(', ')
    });
  };

  const handleKeywordInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addKeyword();
    }
  };

  const handleCategoryChange = (categoryValue: string) => {
    const currentCategories = Array.isArray(filters.category) ? filters.category : (filters.category ? [filters.category] : []);
    
    let newCategories;
    if (currentCategories.includes(categoryValue)) {
      newCategories = currentCategories.filter(cat => cat !== categoryValue);
    } else {
      newCategories = [...currentCategories, categoryValue];
    }
    
    onChange({ ...filters, category: newCategories });
  };

  const handleDateChange = (value: string) => {
    const dateValue = value === 'all' ? '' : value;
    onChange({ ...filters, date_posted: dateValue });
  };

  const selectedCategories = Array.isArray(filters.category) ? filters.category : (filters.category ? [filters.category] : []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mots-clés du poste */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Mots-clés du poste *</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: React, Product Manager, Python..."
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordInputKeyDown}
                className="flex-1"
              />
              <Button
                type="button"
                onClick={addKeyword}
                disabled={!keywordInput.trim()}
                size="sm"
                className="px-3"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {keywordsList.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {keywordsList.map((keyword, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {keyword}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Appuyez sur Entrée ou cliquez sur + pour ajouter un mot-clé
          </p>
        </div>

        {/* Catégorie Multi-Select */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Catégories</Label>
          <Popover open={categoryOpen} onOpenChange={setCategoryOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between"
              >
                {selectedCategories.length > 0 
                  ? `${selectedCategories.length} catégorie(s) sélectionnée(s)`
                  : "Sélectionner des catégories"
                }
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <div className="p-4 space-y-2">
                {categories.map(category => (
                  <div key={category} className="flex items-center space-x-2">
                    <Checkbox
                      id={category}
                      checked={selectedCategories.includes(category)}
                      onCheckedChange={() => handleCategoryChange(category)}
                    />
                    <label
                      htmlFor={category}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      {category}
                    </label>
                  </div>
                ))}
              </div>
            </PopoverContent>
          </Popover>
          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {selectedCategories.map((category) => (
                <Badge
                  key={category}
                  variant="secondary"
                  className="flex items-center gap-1 px-3 py-1"
                >
                  {category}
                  <X
                    className="h-3 w-3 cursor-pointer hover:text-red-500"
                    onClick={() => handleCategoryChange(category)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Localisation */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Localisation des emplois</Label>
          <LocationSelector
            selectedLocations={filters.location}
            onChange={(locations) => onChange({ ...filters, location: locations })}
          />
        </div>

        {/* Date de publication */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Date de publication</Label>
          <Select 
            value={filters.date_posted || 'all'} 
            onValueChange={handleDateChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {dateOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};
