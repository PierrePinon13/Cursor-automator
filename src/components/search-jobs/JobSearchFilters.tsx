
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { X, Plus } from 'lucide-react';
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
    category?: string;
  };
  onChange: (filters: any) => void;
}

export const JobSearchFilters = ({ filters, onChange }: JobSearchFiltersProps) => {
  const [keywordInput, setKeywordInput] = useState('');
  const [keywordsList, setKeywordsList] = useState<string[]>(
    filters.keywords ? filters.keywords.split(',').map(k => k.trim()).filter(k => k) : []
  );

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
    { value: '', label: 'Toutes les dates' },
    { value: '1', label: 'Dernières 24h' },
    { value: '3', label: '3 derniers jours' },
    { value: '7', label: 'Dernière semaine' },
    { value: '14', label: '2 dernières semaines' },
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

        {/* Catégorie */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Catégorie</Label>
          <Select 
            value={filters.category || ''} 
            onValueChange={(value) => onChange({ ...filters, category: value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Sélectionner une catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Aucune catégorie</SelectItem>
              {categories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Localisation */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Localisation</Label>
          <LocationSelector
            selectedLocations={filters.location}
            onChange={(locations) => onChange({ ...filters, location: locations })}
            placeholder="Ex: Paris, Lyon, Remote..."
          />
        </div>

        {/* Date de publication */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Date de publication</Label>
          <Select 
            value={filters.date_posted} 
            onValueChange={(value) => onChange({ ...filters, date_posted: value })}
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
