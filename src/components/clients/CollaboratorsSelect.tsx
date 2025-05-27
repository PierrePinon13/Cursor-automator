
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from '@/components/ui/command';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface CollaboratorsSelectProps {
  users: User[];
  selectedUsers: string[];
  onSelectionChange: (userIds: string[]) => void;
}

export function CollaboratorsSelect({ 
  users = [], 
  selectedUsers = [], 
  onSelectionChange 
}: CollaboratorsSelectProps) {
  const [open, setOpen] = useState(false);

  console.log('CollaboratorsSelect - Données reçues:', { 
    users, 
    selectedUsers,
    usersCount: users?.length,
    selectedCount: selectedUsers?.length 
  });

  // Validation et sécurisation des données
  const safeUsers = Array.isArray(users) ? users.filter(user => 
    user && 
    user.id && 
    (user.full_name || user.email)
  ) : [];

  const safeSelectedUsers = Array.isArray(selectedUsers) ? selectedUsers.filter(id => 
    id && typeof id === 'string'
  ) : [];

  console.log('CollaboratorsSelect - Données sécurisées:', { 
    safeUsers, 
    safeSelectedUsers,
    safeUsersCount: safeUsers.length 
  });

  if (!onSelectionChange || typeof onSelectionChange !== 'function') {
    return <div className="text-sm text-red-500">Erreur de configuration</div>;
  }

  // Trouver les utilisateurs sélectionnés
  const selectedUsersData = safeUsers.filter(user => 
    safeSelectedUsers.includes(user.id)
  );

  const toggleUser = (userId: string) => {
    try {
      const newSelection = safeSelectedUsers.includes(userId)
        ? safeSelectedUsers.filter(id => id !== userId)
        : [...safeSelectedUsers, userId];
      
      console.log('Nouvelle sélection:', newSelection);
      onSelectionChange(newSelection);
    } catch (error) {
      console.error('Erreur lors de la sélection:', error);
    }
  };

  const removeUser = (userId: string) => {
    try {
      const newSelection = safeSelectedUsers.filter(id => id !== userId);
      onSelectionChange(newSelection);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const getDisplayName = (user: User) => {
    return user.full_name || user.email || 'Utilisateur inconnu';
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Affichage des collaborateurs sélectionnés */}
      {selectedUsersData.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsersData.map((user) => (
            <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
              {getDisplayName(user)}
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 hover:bg-transparent"
                onClick={() => removeUser(user.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          ))}
        </div>
      )}
      
      {/* Sélecteur de collaborateurs */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
          >
            {safeSelectedUsers.length > 0 
              ? `${safeSelectedUsers.length} collaborateur(s) sélectionné(s)` 
              : "Sélectionner des collaborateurs"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un collaborateur..." />
            <CommandEmpty>
              {safeUsers.length === 0 
                ? "Aucun utilisateur disponible dans le système."
                : "Aucun utilisateur trouvé avec cette recherche."
              }
            </CommandEmpty>
            {safeUsers.length > 0 && (
              <CommandGroup>
                <div className="px-2 py-1 text-xs text-muted-foreground">
                  Utilisateurs disponibles ({safeUsers.length})
                </div>
                {safeUsers.map((user) => (
                  <CommandItem
                    key={user.id}
                    onSelect={() => {
                      console.log('Utilisateur sélectionné:', user);
                      toggleUser(user.id);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        safeSelectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span className="font-medium">{getDisplayName(user)}</span>
                      {user.full_name && user.email && (
                        <span className="text-sm text-muted-foreground">{user.email}</span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </Command>
        </PopoverContent>
      </Popover>
      
      {/* Message informatif */}
      {safeUsers.length === 0 && (
        <div className="text-sm text-muted-foreground">
          Aucun utilisateur disponible. Les utilisateurs doivent être ajoutés au système pour pouvoir être assignés comme collaborateurs.
        </div>
      )}
    </div>
  );
}
