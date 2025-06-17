
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X, Plus } from 'lucide-react';

interface PersonaFiltersProps {
  filters: {
    role: string[];
    location: string;
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
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Titres de poste */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Titres de poste ciblés *</Label>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="Ex: Directeur RH, CEO, CTO..."
                value={roleInput}
                onChange={(e) => setRoleInput(e.target.value)}
                onKeyDown={handleRoleInputKeyDown}
                className="flex-1"
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
              <div className="flex flex-wrap gap-2">
                {filters.role.map((role, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="flex items-center gap-1 px-3 py-1"
                  >
                    {role}
                    <X
                      className="h-3 w-3 cursor-pointer hover:text-red-500"
                      onClick={() => removeRole(role)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
          <p className="text-sm text-gray-500">
            Appuyez sur Entrée ou cliquez sur + pour ajouter un titre
          </p>
        </div>

        {/* Localisation des profils */}
        <div className="space-y-3">
          <Label className="text-base font-medium">Localisation des profils *</Label>
          <Input
            placeholder="Ex: Paris, France"
            value={filters.location}
            onChange={(e) => onChange({ ...filters, location: e.target.value })}
          />
          <p className="text-sm text-gray-500">
            Localisation géographique des prospects à cibler
          </p>
        </div>
      </div>
    </div>
  );
};
