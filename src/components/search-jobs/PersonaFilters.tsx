
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, X, MapPin, Search } from 'lucide-react';

interface PersonaFiltersProps {
  filters: {
    keywords: string;
    role: string[];
    location: string;
  };
  onChange: (filters: any) => void;
}

export const PersonaFilters = ({ filters, onChange }: PersonaFiltersProps) => {
  const [roleInput, setRoleInput] = useState('');
  const [locationInput, setLocationInput] = useState('');
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([]);

  // Ensure role is always an array
  const safeRole = Array.isArray(filters.role) ? filters.role : [];

  // Suggestions communes pour les localisations
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

  const addRole = () => {
    if (roleInput.trim() && !safeRole.includes(roleInput.trim())) {
      onChange({
        ...filters,
        role: [...safeRole, roleInput.trim()]
      });
      setRoleInput('');
    }
  };

  const removeRole = (role: string) => {
    onChange({
      ...filters,
      role: safeRole.filter(r => r !== role)
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRole();
    }
  };

  const handleLocationInput = (value: string) => {
    setLocationInput(value);
    onChange({ ...filters, location: value });

    if (value.length >= 2) {
      const results = commonLocations.filter(location =>
        location.toLowerCase().includes(value.toLowerCase())
      ).slice(0, 10);
      setLocationSuggestions(results);
      setIsLocationOpen(results.length > 0);
    } else {
      setLocationSuggestions([]);
      setIsLocationOpen(false);
    }
  };

  const selectLocationSuggestion = (location: string) => {
    setLocationInput(location);
    onChange({ ...filters, location });
    setIsLocationOpen(false);
  };

  const suggestedRoles = [
    'CTO', 'Tech Lead', 'Developer', 'Product Manager', 'Engineering Manager',
    'DevOps Engineer', 'Data Scientist', 'UX Designer', 'Frontend Developer',
    'Backend Developer', 'Fullstack Developer'
  ];

  return (
    <div className="space-y-6">
      {/* Mots-clés généraux */}
      <div>
        <Label htmlFor="persona_keywords">Mots-clés généraux (optionnel)</Label>
        <Input
          id="persona_keywords"
          placeholder="Ex: stack JS, innovation, startup..."
          value={filters.keywords}
          onChange={(e) => onChange({ ...filters, keywords: e.target.value })}
        />
      </div>

      {/* Titre du poste */}
      <div>
        <Label htmlFor="role">Titre du poste *</Label>
        <div className="flex gap-2 mb-2">
          <div className="relative flex-1">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              id="role"
              placeholder="Ex: CTO, Tech Lead, Developer..."
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyPress={handleKeyPress}
              className="pl-10"
            />
          </div>
          <Button type="button" onClick={addRole} disabled={!roleInput.trim()}>
            Ajouter
          </Button>
        </div>
        
        {/* Suggestions */}
        <div className="mb-3">
          <p className="text-sm text-gray-600 mb-2">Suggestions :</p>
          <div className="flex flex-wrap gap-1">
            {suggestedRoles.map((role) => (
              <Button
                key={role}
                variant="outline"
                size="sm"
                onClick={() => {
                  if (!safeRole.includes(role)) {
                    onChange({
                      ...filters,
                      role: [...safeRole, role]
                    });
                  }
                }}
                disabled={safeRole.includes(role)}
                className="text-xs h-7"
              >
                {role}
              </Button>
            ))}
          </div>
        </div>
        
        {/* Rôles sélectionnés */}
        {safeRole.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {safeRole.map((role, index) => (
              <Badge key={index} variant="default" className="flex items-center gap-1">
                {role}
                <X
                  className="h-3 w-3 cursor-pointer hover:text-red-200"
                  onClick={() => removeRole(role)}
                />
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Localisation des profils */}
      <div>
        <Label htmlFor="profile_location">Localisation des profils *</Label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            id="profile_location"
            placeholder="Ex: Paris, France ou Remote..."
            value={locationInput || filters.location || ''}
            onChange={(e) => handleLocationInput(e.target.value)}
            onFocus={() => {
              if (locationInput.length >= 2 && locationSuggestions.length > 0) {
                setIsLocationOpen(true);
              }
            }}
            className="pl-10"
            autoComplete="off"
          />
          
          {/* Dropdown des suggestions */}
          {isLocationOpen && locationSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
              {locationSuggestions.map((location, index) => (
                <div
                  key={index}
                  onClick={() => selectLocationSuggestion(location)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-gray-100 border-b border-gray-100 last:border-b-0"
                >
                  <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{location}</div>
                  </div>
                </div>
              ))}
              
              {/* Option pour ajouter une localisation personnalisée */}
              {locationInput.trim() && !locationSuggestions.some(s => s.toLowerCase() === locationInput.toLowerCase()) && (
                <div
                  onClick={() => selectLocationSuggestion(locationInput)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-blue-50 border-t border-gray-200"
                >
                  <Search className="h-4 w-4 text-blue-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">Ajouter "{locationInput}"</div>
                    <div className="text-xs text-gray-500">Localisation personnalisée</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Localisation où rechercher les profils correspondants
        </p>
      </div>
    </div>
  );
};
