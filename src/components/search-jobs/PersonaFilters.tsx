import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus, MapPin, Search } from 'lucide-react';
import { LocationSelector } from './LocationSelector';
import { Card } from '@/components/ui/card';

interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

interface PersonaFiltersProps {
  filters: {
    role: string[];
    location: SelectedLocation[];
  };
  onChange: (filters: any) => void;
}

export const PersonaFilters = ({ filters, onChange }: PersonaFiltersProps) => {
  const [roleInput, setRoleInput] = useState('');

  const addRole = () => {
    const trimmedRole = roleInput.trim();
    if (trimmedRole && !filters.role.includes(trimmedRole)) {
      const newRoles = [...filters.role, trimmedRole];
      onChange({ ...filters, role: newRoles });
      setRoleInput('');
    }
  };

  const removeRole = (roleToRemove: string) => {
    const newRoles = filters.role.filter(role => role !== roleToRemove);
    onChange({ ...filters, role: newRoles });
  };

  const handleRoleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRole();
    }
  };

  return (
    <Card className="p-6 shadow-md border-green-100 bg-gradient-to-br from-green-50/60 to-white/80">
      <div className="space-y-4">
        {/* Titres de poste */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Search className="h-4 w-4 text-green-400" />
            <Label className="text-base font-semibold">Titres de poste ciblés *</Label>
          </div>
          <div className="flex gap-2 items-center">
            <Input
              placeholder="Ex: Directeur RH, CEO, CTO..."
              value={roleInput}
              onChange={(e) => setRoleInput(e.target.value)}
              onKeyDown={handleRoleInputKeyDown}
              className="flex-1 h-9 border-green-200 focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
            <Button
              type="button"
              onClick={addRole}
              disabled={!roleInput.trim()}
              size="sm"
              className="px-3"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {filters.role.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {filters.role.map((role, index) => (
                <>
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1 text-base bg-green-50 border-green-200 text-green-800 font-mono shadow-sm transition-all duration-150 hover:bg-green-100 cursor-pointer"
                  >
                    &quot;{role}&quot;
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500 ml-1"
                      onClick={() => removeRole(role)}
                    />
                  </Badge>
                  {index < filters.role.length - 1 && (
                    <span className="mx-1 text-green-500 font-bold">OR</span>
                  )}
                </>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mt-1">
            Appuyez sur Entrée ou cliquez sur + pour ajouter un titre
          </p>
        </div>
        <hr className="my-3 border-green-100" />
        {/* Localisation des profils */}
        <div>
          <div className="flex items-center gap-2 mb-1">
            <MapPin className="h-4 w-4 text-blue-400" />
            <Label className="text-base font-semibold">Localisation des profils *</Label>
          </div>
          <LocationSelector
            selectedLocations={filters.location}
            onChange={(locations) => onChange({ ...filters, location: locations })}
          />
          <p className="text-xs text-gray-500 mt-1">
            Localisation géographique des prospects à cibler
          </p>
        </div>
      </div>
    </Card>
  );
};
