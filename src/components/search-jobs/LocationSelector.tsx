
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
                <Search className="h-3 w-3 text-orange-500" title="Sera résolu dynamiquement" />
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
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              ref={inputRef}
              id="location"
              placeholder="Tapez une ville, région ou pays..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
              autoComplete="off"
            />
          </div>
        </PopoverTrigger>
        
        {isOpen && suggestions.length > 0 && (
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandList>
                <CommandGroup>
                  {suggestions.map((location) => (
                    <CommandItem
                      key={`${location.label}-${location.geoId}`}
                      onSelect={() => handleSuggestionSelect(location)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <MapPin className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="font-medium">{location.label}</div>
                        {location.country && location.country !== location.label && (
                          <div className="text-xs text-gray-500">{location.country}</div>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                
                {/* Option pour ajouter une localisation non trouvée */}
                {inputValue.trim() && !suggestions.some(s => s.label.toLowerCase() === inputValue.toLowerCase()) && (
                  <CommandGroup>
                    <CommandItem
                      onSelect={addUnresolvedLocation}
                      className="flex items-center gap-2 cursor-pointer border-t"
                    >
                      <Search className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">🔍 Rechercher "{inputValue}"</div>
                        <div className="text-xs text-gray-500">Sera résolu dynamiquement</div>
                      </div>
                    </CommandItem>
                  </CommandGroup>
                )}
              </CommandList>
            </Command>
          </PopoverContent>
        )}
      </Popover>
    </div>
  );
};
