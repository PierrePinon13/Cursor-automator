
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MapPin, X } from 'lucide-react';

interface JobSearchFiltersProps {
  filters: {
    keywords: string;
    location: string[];
    date_posted: string;
    sort_by: string;
  };
  onChange: (filters: any) => void;
}

export const JobSearchFilters = ({ filters, onChange }: JobSearchFiltersProps) => {
  const [locationInput, setLocationInput] = useState('');

  const addLocation = () => {
    if (locationInput.trim() && !filters.location.includes(locationInput.trim())) {
      onChange({
        ...filters,
        location: [...filters.location, locationInput.trim()]
      });
      setLocationInput('');
    }
  };

  const removeLocation = (location: string) => {
    onChange({
      ...filters,
      location: filters.location.filter(l => l !== location)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addLocation();
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mots-clés */}
      <div className="lg:col-span-2">
        <Label htmlFor="keywords">Mots-clés *</Label>
        <Input
          id="keywords"
          placeholder="Ex: développeur react, product manager..."
          value={filters.keywords}
          onChange={(e) => onChange({ ...filters, keywords: e.target.value })}
        />
      </div>

      {/* Localisation */}
      <div className="lg:col-span-2">
        <Label htmlFor="location">Localisation</Label>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="location"
              placeholder="Ajouter une localisation..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button type="button" onClick={addLocation} disabled={!locationInput.trim()}>
            Ajouter
          </Button>
        </div>
        
        {filters.location.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.location.map((location, index) => (
              <Badge key={index} variant="secondary" className="flex items-center gap-1">
                {location}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-500"
                  onClick={() => removeLocation(location)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Date de publication */}
      <div>
        <Label htmlFor="date_posted">Date de publication</Label>
        <Select value={filters.date_posted} onValueChange={(value) => onChange({ ...filters, date_posted: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="any">Toutes les dates</SelectItem>
            <SelectItem value="past_24h">Dernières 24h</SelectItem>
            <SelectItem value="past_week">Dernière semaine</SelectItem>
            <SelectItem value="past_month">Dernier mois</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tri */}
      <div>
        <Label htmlFor="sort_by">Trier par</Label>
        <Select value={filters.sort_by} onValueChange={(value) => onChange({ ...filters, sort_by: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (plus récent)</SelectItem>
            <SelectItem value="relevance">Pertinence</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
