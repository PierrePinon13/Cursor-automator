
import { useState, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Search } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { locationData, searchLocations, findLocationByLabel, type LocationData } from '@/data/locations';

interface SelectedLocation {
  label: string;
  geoId: number | null; // null pour les localisations non trouvées
  isResolved: boolean;
}

interface LocationSelectorProps {
  selectedLocations: SelectedLocation[];
  onChange: (locations: SelectedLocation[]) => void;
}

export const LocationSelector = ({ selectedLocations, onChange }: LocationSelectorProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<LocationData[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputValue.length >= 2) {
      const results = searchLocations(inputValue);
      setSuggestions(results);
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [inputValue]);

  const addLocation = (location: LocationData | string) => {
    let newLocation: SelectedLocation;
    
    if (typeof location === 'string') {
      // Localisation non trouvée - sera résolue dynamiquement
      newLocation = {
        label: location,
        geoId: null,
        isResolved: false
      };
    } else {
      // Localisation trouvée dans la base locale
      newLocation = {
        label: location.label,
        geoId: location.geoId,
        isResolved: true
      };
    }

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
      
      // Chercher d'abord dans les suggestions
      const foundLocation = findLocationByLabel(inputValue.trim());
      if (foundLocation) {
        addLocation(foundLocation);
      } else {
        // Ajouter comme localisation non résolue
        addLocation(inputValue.trim());
      }
    }
  };

  const handleSuggestionSelect = (location: LocationData) => {
    addLocation(location);
  };

  const addUnresolvedLocation = () => {
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
              variant={location.isResolved ? "secondary" : "outline"}
              className="flex items-center gap-1 pr-1"
            >
              <MapPin className="h-3 w-3" />
              {location.label}
              {!location.isResolved && (
                <Search className="h-3 w-3 text-orange-500" />
              )}
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
            {suggestions.map((location) => (
              <div
                key={`${location.label}-${location.geoId}`}
                onClick={() => handleSuggestionSelect(location)}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
              >
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{location.label}</div>
                  {location.country && location.country !== location.label && (
                    <div className="text-xs text-gray-500 truncate">{location.country}</div>
                  )}
                </div>
              </div>
            ))}
            
            {/* Option pour ajouter une localisation non trouvée */}
            {inputValue.trim() && !suggestions.some(s => s.label.toLowerCase() === inputValue.toLowerCase()) && (
              <div
                onClick={addUnresolvedLocation}
                className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-orange-50 border-t border-gray-200"
              >
                <Search className="h-4 w-4 text-orange-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">🔍 Rechercher "{inputValue}"</div>
                  <div className="text-xs text-gray-500">Sera résolu dynamiquement</div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
