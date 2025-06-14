
import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, X } from 'lucide-react';

interface PersonaFiltersProps {
  filters: {
    keywords: string;
    role: string[];
    profile_language: string;
  };
  onChange: (filters: any) => void;
}

export const PersonaFilters = ({ filters, onChange }: PersonaFiltersProps) => {
  const [roleInput, setRoleInput] = useState('');

  // Ensure role is always an array
  const safeRole = Array.isArray(filters.role) ? filters.role : [];

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

      {/* Langue du profil */}
      <div>
        <Label htmlFor="profile_language">Langue du profil</Label>
        <Select value={filters.profile_language} onValueChange={(value) => onChange({ ...filters, profile_language: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="fr">Français</SelectItem>
            <SelectItem value="en">Anglais</SelectItem>
            <SelectItem value="es">Espagnol</SelectItem>
            <SelectItem value="de">Allemand</SelectItem>
            <SelectItem value="it">Italien</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
