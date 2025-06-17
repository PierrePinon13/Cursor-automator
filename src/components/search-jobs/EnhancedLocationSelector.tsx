
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { X, MapPin, ChevronDown } from 'lucide-react';

interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

interface EnhancedLocationSelectorProps {
  selectedLocations: SelectedLocation[];
  onChange: (locations: SelectedLocation[]) => void;
}

export const EnhancedLocationSelector = ({ selectedLocations, onChange }: EnhancedLocationSelectorProps) => {
  const [open, setOpen] = useState(false);
  const [customInput, setCustomInput] = useState('');

  const predefinedLocations = [
    { label: 'France', geoId: 105015875, isResolved: true },
    { label: 'Paris, France', geoId: 105148282, isResolved: true },
    { label: 'Lyon, France', geoId: 106593436, isResolved: true },
    { label: 'Marseille, France', geoId: 106967757, isResolved: true },
    { label: 'Toulouse, France', geoId: 102977856, isResolved: true },
    { label: 'Nice, France', geoId: 106314872, isResolved: true },
    { label: 'Nantes, France', geoId: 105934280, isResolved: true },
    { label: 'Strasbourg, France', geoId: 105394914, isResolved: true },
    { label: 'Montpellier, France', geoId: 105582112, isResolved: true },
    { label: 'Bordeaux, France', geoId: 105089103, isResolved: true },
    { label: 'Lille, France', geoId: 105936862, isResolved: true },
    { label: 'Rennes, France', geoId: 105934277, isResolved: true },
    { label: 'Île-de-France, France', geoId: 104994270, isResolved: true },
    { label: 'Provence-Alpes-Côte d\'Azur, France', geoId: 105583267, isResolved: true },
    { label: 'Auvergne-Rhône-Alpes, France', geoId: 105662677, isResolved: true },
    { label: 'Nouvelle-Aquitaine, France', geoId: 106693272, isResolved: true },
    { label: 'Occitanie, France', geoId: 106936147, isResolved: true },
    { label: 'Grand Est, France', geoId: 106051052, isResolved: true },
    { label: 'Hauts-de-France, France', geoId: 105947215, isResolved: true },
    { label: 'Pays de la Loire, France', geoId: 105934274, isResolved: true },
    { label: 'Bretagne, France', geoId: 105934276, isResolved: true },
    { label: 'Centre-Val de Loire, France', geoId: 105394913, isResolved: true },
  ];

  const addLocation = (location: SelectedLocation) => {
    if (!selectedLocations.some(l => l.label === location.label)) {
      onChange([...selectedLocations, location]);
    }
    setOpen(false);
  };

  const addCustomLocation = () => {
    if (customInput.trim() && !selectedLocations.some(l => l.label === customInput.trim())) {
      const newLocation: SelectedLocation = {
        label: customInput.trim(),
        geoId: null,
        isResolved: false
      };
      onChange([...selectedLocations, newLocation]);
      setCustomInput('');
    }
  };

  const removeLocation = (locationToRemove: SelectedLocation) => {
    onChange(selectedLocations.filter(l => l.label !== locationToRemove.label));
  };

  const handleCustomInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addCustomLocation();
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="flex-1 justify-between"
            >
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Sélectionner une localisation
              </span>
              <ChevronDown className="h-4 w-4 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <Command>
              <CommandInput placeholder="Rechercher une localisation..." />
              <CommandList>
                <CommandEmpty>Aucune localisation trouvée.</CommandEmpty>
                <CommandGroup heading="Localisations populaires">
                  {predefinedLocations.map((location) => (
                    <CommandItem
                      key={location.label}
                      onSelect={() => addLocation(location)}
                      className="cursor-pointer"
                    >
                      <MapPin className="mr-2 h-4 w-4" />
                      {location.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Ou tapez une localisation personnalisée..."
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleCustomInputKeyDown}
          className="flex-1"
        />
        <Button
          type="button"
          onClick={addCustomLocation}
          disabled={!customInput.trim()}
          size="sm"
          variant="outline"
        >
          Ajouter
        </Button>
      </div>

      {selectedLocations.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedLocations.map((location, index) => (
            <Badge
              key={index}
              variant={location.isResolved ? "default" : "secondary"}
              className="flex items-center gap-1 px-3 py-1"
            >
              <MapPin className="h-3 w-3" />
              {location.label}
              <X
                className="h-3 w-3 cursor-pointer hover:text-red-500"
                onClick={() => removeLocation(location)}
              />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
};
