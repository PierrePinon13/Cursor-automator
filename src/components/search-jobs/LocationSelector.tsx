
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Search } from 'lucide-react';

interface SelectedLocation {
  label: string;
}

interface LocationSelectorProps {
  selectedLocations: SelectedLocation[];
  onChange: (locations: SelectedLocation[]) => void;
}

export const LocationSelector = ({ selectedLocations, onChange }: LocationSelectorProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions de base sans geoId
  const commonLocations = [
    "Paris, France",
    "Lyon, France", 
    "Marseille, France",
    "Toulouse, France",
    "Lille, France",
    "Bordeaux, France",
    "Nantes, France",
    "Nice, France",
    "Strasbourg, France",
    "Montpellier, France",
    "Rennes, France",
    "Grenoble, France",
    "France",
    "Remote",
    "Télétravail",
    "London, UK",
    "Berlin, Germany",
    "Amsterdam, Netherlands",
    "Brussels, Belgium",
    "Geneva, Switzerland",
    "Barcelona, Spain",
    "Milan, Italy"
  ];

  useEffect(() => {
    if (inputValue.length >= 2) {
      const results = commonLocations.filter(location =>
        location.toLowerCase().includes(inputValue.toLowerCase())
      ).slice(0, 10);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [inputValue]);

  const addLocation = (locationText: string) => {
    const newLocation: SelectedLocation = {
      label: locationText
    };

    // Vérifier si la localisation n'est pas déjà sélectionnée
    const isAlreadySelected = selectedLocations.some(
      loc => loc.label.toLowerCase() === newLocation.label.toLowerCase()
    );

    if (!isAlreadySelected) {
      onChange([...selectedLocations, newLocation]);
    }

    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeLocation = (indexToRemove: number) => {
    const newLocations = selectedLocations.filter((_, index) => index !== indexToRemove);
    onChange(newLocations);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      addLocation(inputValue.trim());
    }
  };

  const handleSuggestionSelect = (location: string) => {
    addLocation(location);
  };

  const addCustomLocation = () => {
    if (inputValue.trim()) {
      addLocation(inputValue.trim());
    }
  };

  return (
    <div className="space-y-3">
      <Label htmlFor="location">Localisation</Label>
      
      {/* Tags des localisations sélectionnées */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedLocations.map((location, index) => (
            <Badge 
              key={index} 
              variant="secondary"
              className="flex items-center gap-1 pr-1"
            >
              <MapPin className="h-3 w-3" />
              {location.label}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={() => removeLocation(index)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}

      {/* Input avec auto-complétion */}
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          ref={inputRef}
          id="location"
          placeholder="Tapez une ville, région ou pays..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          onFocus={() => {
            if (inputValue.length >= 2 && suggestions.length > 0) {
              setIsOpen(true);
            }
          }}
          className="pl-10"
          autoComplete="off"
        />
        
        {/* Dropdown des suggestions */}
        {isOpen && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
            {suggestions.map((location, index) => (
              <div
                key={index}
                onClick={() => handleSuggestionSelect(location)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{location}</div>
                </div>
              </div>
            ))}
            
            {/* Option pour ajouter une localisation personnalisée */}
            {inputValue.trim() && !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase()) && (
              <div
                onClick={addCustomLocation}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 border-t border-gray-200"
              >
                <Search className="h-4 w-4 text-blue-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">Ajouter "{inputValue}"</div>
                  <div className="text-xs text-gray-500">Localisation personnalisée</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
