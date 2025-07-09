import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Plus, ChevronDown, MapPin, Calendar, Search } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { Card } from '@/components/ui/card';

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
    <Card className="p-6 shadow-md border-blue-100 bg-gradient-to-br from-blue-50/60 to-white/80">
      <div className="space-y-4">
        {/* Mots-clés du poste */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="h-4 w-4 text-blue-400" />
            <Label className="text-base font-semibold">Mots-clés du poste *</Label>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Ex: React, Product Manager, Python..."
              value={keywordInput}
              onChange={(e) => setKeywordInput(e.target.value)}
              onKeyDown={handleKeywordInputKeyDown}
              className="flex-1 h-9 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
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
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {keywordsList.map((keyword, index) => (
                <>
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1 text-base bg-blue-50 border-blue-200 text-blue-800 font-mono shadow-sm transition-all duration-150 hover:bg-blue-100 cursor-pointer"
                  >
                    &quot;{keyword}&quot;
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500 ml-1"
                      onClick={() => removeKeyword(keyword)}
                    />
                  </Badge>
                  {index < keywordsList.length - 1 && (
                    <span className="mx-1 text-blue-500 font-bold">OR</span>
                  )}
                </>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Appuyez sur Entrée ou cliquez sur + pour ajouter un mot-clé
          </p>
        </div>
        <hr className="my-3 border-blue-100" />
        {/* Localisation */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-green-400" />
            <Label className="text-base font-semibold">Localisation des emplois</Label>
          </div>
          <LocationSelector
            selectedLocations={filters.location}
            onChange={(locations) => onChange({ ...filters, location: locations })}
            showRadius={false}
          />
        </div>
        <hr className="my-3 border-blue-100" />
        {/* Date de publication */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="h-4 w-4 text-purple-400" />
            <Label className="text-base font-semibold">Date de publication</Label>
          </div>
          <Select 
            value={filters.date_posted || 'all'} 
            onValueChange={handleDateChange}
          >
            <SelectTrigger className="h-9 border-blue-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100">
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
    </Card>
  );
};
