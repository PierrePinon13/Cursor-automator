
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

export function CollaboratorsSelect({ users = [], selectedUsers = [], onSelectionChange }: CollaboratorsSelectProps) {
  const [open, setOpen] = useState(false);

  console.log('CollaboratorsSelect render:', { 
    users, 
    selectedUsers,
    usersType: typeof users,
    selectedUsersType: typeof selectedUsers,
    usersIsArray: Array.isArray(users),
    selectedUsersIsArray: Array.isArray(selectedUsers),
    usersLength: users?.length,
    selectedUsersLength: selectedUsers?.length
  });

  // Vérifications de sécurité très strictes
  if (!users || !Array.isArray(users)) {
    console.error('CollaboratorsSelect: users is not a valid array:', users);
    return (
      <div className="text-sm text-gray-500">
        Erreur: données utilisateurs invalides
      </div>
    );
  }

  if (!selectedUsers || !Array.isArray(selectedUsers)) {
    console.error('CollaboratorsSelect: selectedUsers is not a valid array:', selectedUsers);
    return (
      <div className="text-sm text-gray-500">
        Erreur: sélection utilisateurs invalide
      </div>
    );
  }

  if (!onSelectionChange || typeof onSelectionChange !== 'function') {
    console.error('CollaboratorsSelect: onSelectionChange is not a function:', onSelectionChange);
    return (
      <div className="text-sm text-gray-500">
        Erreur: fonction de callback invalide
      </div>
    );
  }

  // S'assurer que tous les éléments de users sont valides
  const validUsers = users.filter(user => {
    const isValid = user && typeof user === 'object' && typeof user.id === 'string' && user.id.length > 0;
    if (!isValid) {
      console.warn('CollaboratorsSelect: Invalid user object:', user);
    }
    return isValid;
  });

  // S'assurer que tous les éléments de selectedUsers sont des strings valides
  const validSelectedUsers = selectedUsers.filter(userId => {
    const isValid = typeof userId === 'string' && userId.length > 0;
    if (!isValid) {
      console.warn('CollaboratorsSelect: Invalid selected user ID:', userId);
    }
    return isValid;
  });

  console.log('After validation:', { validUsers, validSelectedUsers });

  // Filtrer les utilisateurs sélectionnés avec une vérification supplémentaire
  const selectedUsersData = validUsers.filter(user => {
    try {
      return validSelectedUsers.includes(user.id);
    } catch (error) {
      console.error('Error filtering selected users:', error, { user, validSelectedUsers });
      return false;
    }
  });

  console.log('selectedUsersData:', selectedUsersData);

  const toggleUser = (userId: string) => {
    console.log('toggleUser called with:', userId);
    console.log('Current validSelectedUsers:', validSelectedUsers);
    
    try {
      const newSelection = validSelectedUsers.includes(userId)
        ? validSelectedUsers.filter(id => id !== userId)
        : [...validSelectedUsers, userId];
      
      console.log('New selection:', newSelection);
      onSelectionChange(newSelection);
    } catch (error) {
      console.error('Error in toggleUser:', error);
    }
  };

  const removeUser = (userId: string) => {
    console.log('removeUser called with:', userId);
    try {
      const newSelection = validSelectedUsers.filter(id => id !== userId);
      console.log('New selection after removal:', newSelection);
      onSelectionChange(newSelection);
    } catch (error) {
      console.error('Error in removeUser:', error);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {selectedUsersData.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsersData.map((user) => {
            try {
              return (
                <Badge key={user.id} variant="secondary" className="flex items-center gap-1">
                  {user.full_name || user.email}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 hover:bg-transparent"
                    onClick={() => removeUser(user.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            } catch (error) {
              console.error('Error rendering selected user badge:', error, user);
              return null;
            }
          })}
        </div>
      )}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="justify-between"
          >
            {validSelectedUsers.length > 0 
              ? `${validSelectedUsers.length} collaborateur(s)` 
              : "Ajouter des collaborateurs"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un utilisateur..." />
            <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
            <CommandGroup>
              {validUsers.map((user) => {
                try {
                  return (
                    <CommandItem
                      key={user.id}
                      onSelect={() => toggleUser(user.id)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          validSelectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col">
                        <span>{user.full_name || user.email}</span>
                        {user.full_name && (
                          <span className="text-sm text-gray-500">{user.email}</span>
                        )}
                      </div>
                    </CommandItem>
                  );
                } catch (error) {
                  console.error('Error rendering user item:', error, user);
                  return null;
                }
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
