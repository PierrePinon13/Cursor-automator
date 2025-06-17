
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
    // FRANCE EN PREMIER
    { label: 'France', geoId: 105015875, isResolved: true },
    
    // RÉGIONS FRANÇAISES
    { label: 'Île-de-France', geoId: 104994270, isResolved: true },
    { label: 'Provence-Alpes-Côte d\'Azur', geoId: 105583267, isResolved: true },
    { label: 'Auvergne-Rhône-Alpes', geoId: 105662677, isResolved: true },
    { label: 'Nouvelle-Aquitaine', geoId: 106693272, isResolved: true },
    { label: 'Occitanie', geoId: 106936147, isResolved: true },
    { label: 'Grand Est', geoId: 106051052, isResolved: true },
    { label: 'Hauts-de-France', geoId: 105947215, isResolved: true },
    { label: 'Pays de la Loire', geoId: 105934274, isResolved: true },
    { label: 'Bretagne', geoId: 105934276, isResolved: true },
    { label: 'Centre-Val de Loire', geoId: 105394913, isResolved: true },
    { label: 'Normandie', geoId: 105934278, isResolved: true },
    { label: 'Bourgogne-Franche-Comté', geoId: 105394920, isResolved: true },
    { label: 'Corse', geoId: 106314875, isResolved: true },
    
    // GRANDES VILLES FRANÇAISES
    { label: 'Paris', geoId: 105148282, isResolved: true },
    { label: 'Lyon', geoId: 106593436, isResolved: true },
    { label: 'Marseille', geoId: 106967757, isResolved: true },
    { label: 'Toulouse', geoId: 102977856, isResolved: true },
    { label: 'Nice', geoId: 106314872, isResolved: true },
    { label: 'Nantes', geoId: 105934280, isResolved: true },
    { label: 'Strasbourg', geoId: 105394914, isResolved: true },
    { label: 'Montpellier', geoId: 105582112, isResolved: true },
    { label: 'Bordeaux', geoId: 105089103, isResolved: true },
    { label: 'Lille', geoId: 105936862, isResolved: true },
    { label: 'Rennes', geoId: 105934277, isResolved: true },
    { label: 'Reims', geoId: 105394915, isResolved: true },
    { label: 'Le Havre', geoId: 105934279, isResolved: true },
    { label: 'Saint-Étienne', geoId: 106593437, isResolved: true },
    { label: 'Toulon', geoId: 106314873, isResolved: true },
    { label: 'Grenoble', geoId: 106593438, isResolved: true },
    { label: 'Dijon', geoId: 105394916, isResolved: true },
    { label: 'Angers', geoId: 105934281, isResolved: true },
    { label: 'Nîmes', geoId: 105582113, isResolved: true },
    { label: 'Villeurbanne', geoId: 106593439, isResolved: true },
    { label: 'Le Mans', geoId: 105934282, isResolved: true },
    { label: 'Aix-en-Provence', geoId: 106314874, isResolved: true },
    { label: 'Clermont-Ferrand', geoId: 106662678, isResolved: true },
    { label: 'Brest', geoId: 105934283, isResolved: true },
    { label: 'Tours', geoId: 105394917, isResolved: true },
    { label: 'Limoges', geoId: 106693273, isResolved: true },
    { label: 'Amiens', geoId: 105947216, isResolved: true },
    { label: 'Annecy', geoId: 106662679, isResolved: true },
    { label: 'Perpignan', geoId: 105582114, isResolved: true },
    { label: 'Boulogne-Billancourt', geoId: 105148283, isResolved: true },
    { label: 'Metz', geoId: 106051053, isResolved: true },
    { label: 'Besançon', geoId: 105394918, isResolved: true },
    { label: 'Orléans', geoId: 105394919, isResolved: true },
    { label: 'Mulhouse', geoId: 106051054, isResolved: true },
    { label: 'Rouen', geoId: 105934284, isResolved: true },
    { label: 'Caen', geoId: 105934285, isResolved: true },
    { label: 'Nancy', geoId: 106051055, isResolved: true },
    { label: 'Argenteuil', geoId: 105148284, isResolved: true },
    { label: 'Montreuil', geoId: 105148285, isResolved: true },
    { label: 'Saint-Denis', geoId: 105148286, isResolved: true },
    { label: 'Roubaix', geoId: 105936863, isResolved: true },
    { label: 'Tourcoing', geoId: 105936864, isResolved: true },
    { label: 'Avignon', geoId: 106314876, isResolved: true },
    { label: 'Créteil', geoId: 105148287, isResolved: true },
    { label: 'Poitiers', geoId: 106693274, isResolved: true },
    { label: 'Fort-de-France', geoId: 106936148, isResolved: true },
    { label: 'Courbevoie', geoId: 105148288, isResolved: true },
    { label: 'Versailles', geoId: 105148289, isResolved: true }
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
                <CommandGroup heading="France et régions">
                  {predefinedLocations.slice(0, 15).map((location) => (
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
                <CommandGroup heading="Grandes villes">
                  {predefinedLocations.slice(15).map((location) => (
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
