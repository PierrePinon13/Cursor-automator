
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronDown, Users, User, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserSelection } from '@/hooks/useDashboardStats';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface UserSelectorProps {
  users: User[];
  selection: UserSelection;
  onSelectionChange: (selection: UserSelection) => void;
}

export function UserSelector({ users, selection, onSelectionChange }: UserSelectorProps) {
  const [open, setOpen] = useState(false);

  const getSelectionLabel = () => {
    switch (selection.type) {
      case 'personal':
        return 'Mes stats';
      case 'global':
        return 'Vue globale';
      case 'specific':
        if (!selection.userIds?.length) return 'Sélectionner des utilisateurs';
        if (selection.userIds.length === 1) {
          const user = users.find(u => u.id === selection.userIds![0]);
          return user?.full_name || user?.email || 'Utilisateur';
        }
        return `${selection.userIds.length} utilisateurs`;
      default:
        return 'Sélectionner';
    }
  };

  const getSelectionIcon = () => {
    switch (selection.type) {
      case 'personal':
        return <User className="h-4 w-4" />;
      case 'global':
        return <Globe className="h-4 w-4" />;
      case 'specific':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const handleTypeChange = (type: UserSelection['type']) => {
    if (type === 'specific') {
      onSelectionChange({ type, userIds: [] });
    } else {
      onSelectionChange({ type });
    }
  };

  const handleUserToggle = (userId: string) => {
    if (selection.type !== 'specific') return;

    const currentIds = selection.userIds || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];

    onSelectionChange({ type: 'specific', userIds: newIds });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
        >
          <div className="flex items-center gap-2">
            {getSelectionIcon()}
            <span className="truncate">{getSelectionLabel()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0">
        <Command>
          <CommandInput placeholder="Rechercher un utilisateur..." />
          <CommandList>
            <CommandGroup heading="Type de vue">
              <CommandItem onSelect={() => handleTypeChange('personal')}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selection.type === 'personal' ? "opacity-100" : "opacity-0"
                  )}
                />
                <User className="mr-2 h-4 w-4" />
                Mes statistiques
              </CommandItem>
              <CommandItem onSelect={() => handleTypeChange('global')}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selection.type === 'global' ? "opacity-100" : "opacity-0"
                  )}
                />
                <Globe className="mr-2 h-4 w-4" />
                Vue globale (tous)
              </CommandItem>
              <CommandItem onSelect={() => handleTypeChange('specific')}>
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selection.type === 'specific' ? "opacity-100" : "opacity-0"
                  )}
                />
                <Users className="mr-2 h-4 w-4" />
                Sélection personnalisée
              </CommandItem>
            </CommandGroup>

            {selection.type === 'specific' && (
              <CommandGroup heading="Utilisateurs">
                <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
                {users.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => handleUserToggle(user.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        selection.userIds?.includes(user.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {user.full_name || user.email}
                      </span>
                      {user.full_name && (
                        <span className="text-sm text-muted-foreground">
                          {user.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
