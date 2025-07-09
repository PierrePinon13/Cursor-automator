import { Slider } from '@/components/ui/slider';
import { useEffect, useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X, Search } from 'lucide-react';

interface SelectedLocation {
  label: string;
  radius?: number;
}

interface LocationSelectorProps {
  selectedLocations: SelectedLocation[];
  onChange: (locations: SelectedLocation[]) => void;
  showRadius?: boolean; // <-- ajout
}

export const LocationSelector = ({ selectedLocations, onChange, showRadius = true }: LocationSelectorProps) => {
  const [inputValue, setInputValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [radius, setRadius] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Suggestions de base sans geoId
  const commonLocations = [
    "Paris, France", "Lyon, France", "Marseille, France", "Toulouse, France", "Lille, France", "Bordeaux, France", "Nantes, France", "Nice, France", "Strasbourg, France", "Montpellier, France", "Rennes, France", "Grenoble, France", "Rouen, France", "Dijon, France", "Angers, France", "Saint-Étienne, France", "Le Havre, France", "Reims, France", "Toulon, France", "Le Mans, France", "Aix-en-Provence, France", "Brest, France", "Tours, France", "Limoges, France", "Amiens, France", "Annecy, France", "Perpignan, France", "Boulogne-Billancourt, France", "Metz, France", "Besançon, France", "Orléans, France", "Mulhouse, France", "Caen, France", "Nancy, France", "Clermont-Ferrand, France", "France", "Remote", "Télétravail",
    // Régions françaises
    "Île-de-France, France", "Provence-Alpes-Côte d'Azur, France", "Auvergne-Rhône-Alpes, France", "Nouvelle-Aquitaine, France", "Occitanie, France", "Grand Est, France", "Hauts-de-France, France", "Pays de la Loire, France", "Bretagne, France", "Centre-Val de Loire, France", "Normandie, France", "Bourgogne-Franche-Comté, France", "Corse, France",
    // Europe
    "London, UK", "Manchester, UK", "Birmingham, UK", "Berlin, Germany", "Munich, Germany", "Frankfurt, Germany", "Hamburg, Germany", "Amsterdam, Netherlands", "Rotterdam, Netherlands", "Brussels, Belgium", "Antwerp, Belgium", "Geneva, Switzerland", "Zurich, Switzerland", "Barcelona, Spain", "Madrid, Spain", "Valencia, Spain", "Milan, Italy", "Rome, Italy", "Turin, Italy", "Lisbon, Portugal", "Porto, Portugal", "Dublin, Ireland", "Vienna, Austria", "Prague, Czech Republic", "Warsaw, Poland", "Budapest, Hungary", "Copenhagen, Denmark", "Stockholm, Sweden", "Oslo, Norway", "Helsinki, Finland",
    // Monde
    "New York, USA", "San Francisco, USA", "Los Angeles, USA", "Chicago, USA", "Boston, USA", "Toronto, Canada", "Montreal, Canada", "Vancouver, Canada", "Sydney, Australia", "Melbourne, Australia", "Singapore", "Hong Kong", "Tokyo, Japan", "Seoul, South Korea", "Shanghai, China", "Beijing, China", "Dubai, UAE", "Sao Paulo, Brazil", "Mexico City, Mexico", "Cape Town, South Africa", "Johannesburg, South Africa"
  ];

  useEffect(() => {
    if (inputValue.length >= 2) {
      let results = commonLocations.filter(location =>
        location.toLowerCase().includes(inputValue.toLowerCase())
      );
      // Si l'utilisateur tape 'france', forcer 'France' en premier
      if (inputValue.trim().toLowerCase().startsWith('france')) {
        results = [
          'France',
          ...results.filter(l => l.toLowerCase() !== 'france')
        ];
      }
      setSuggestions(results.slice(0, 10));
      setIsOpen(results.length > 0);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [inputValue]);

  // Helper pour savoir si c'est un pays (ici, on considère France, Remote, Télétravail, etc.)
  const isCountry = (label: string) => {
    const lower = label.toLowerCase();
    return (
      lower === 'france' || lower === 'remote' || lower === 'télétravail' ||
      lower.startsWith('pays') || lower.startsWith('europe') || lower.startsWith('monde')
    );
  };

  const addLocation = (locationText: string) => {
    // N'autoriser qu'une seule localisation
    let newLocation: SelectedLocation = { label: locationText };
    if (!isCountry(locationText)) {
      newLocation.radius = radius;
    }
    onChange([newLocation]);
    setInputValue('');
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const removeLocation = () => {
    onChange([]);
    setRadius(0);
  };

  // Mettre à jour le rayon si la localisation sélectionnée change
  useEffect(() => {
    if (selectedLocations.length === 1 && !isCountry(selectedLocations[0].label)) {
      setRadius(selectedLocations[0].radius ?? 0);
    } else {
      setRadius(0);
    }
  }, [selectedLocations]);

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
      {/* Tag de la localisation sélectionnée */}
      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <Badge 
            key={selectedLocations[0].label} 
            variant="secondary"
            className="flex items-center gap-1 pr-1"
          >
            <MapPin className="h-3 w-3" />
            {selectedLocations[0].label}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={removeLocation}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}
      {/* Input avec auto-complétion, masqué si une localisation est sélectionnée */}
      {selectedLocations.length === 0 && (
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
              {inputValue.trim() &&
                !suggestions.some(s => s.toLowerCase() === inputValue.toLowerCase()) &&
                inputValue.trim().toLowerCase() !== 'france' && (
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
      )}
      {/* Slider de rayon si la localisation est une ville */}
      {showRadius && selectedLocations.length === 1 && !isCountry(selectedLocations[0].label) && (
        <div className="mt-2">
          <Label className="text-sm font-medium mb-1 block">Rayon autour de la ville</Label>
          <Slider
            min={0}
            max={5}
            step={1}
            value={[
              [0, 8, 16, 40, 80, 160].indexOf(radius) !== -1 ? [0, 8, 16, 40, 80, 160].indexOf(radius) : 4
            ]}
            onValueChange={([idx]) => {
              const values = [0, 8, 16, 40, 80, 160];
              setRadius(values[idx]);
              // Mettre à jour la localisation avec le nouveau rayon
              onChange([{ label: selectedLocations[0].label, radius: values[idx] }]);
            }}
          />
          {/* Labels sous le slider */}
          <div className="flex justify-between mt-2 text-xs text-gray-600 w-full">
            <span>0 km</span>
            <span>8 km</span>
            <span>16 km</span>
            <span>40 km</span>
            <span>80 km</span>
            <span>160 km</span>
          </div>
        </div>
      )}
    </div>
  );
};
