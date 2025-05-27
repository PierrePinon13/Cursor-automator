
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

  // Vérification exhaustive des props
  console.log('CollaboratorsSelect - Props reçues:', { 
    users: users,
    usersType: typeof users,
    usersIsArray: Array.isArray(users),
    usersLength: users?.length,
    selectedUsers: selectedUsers,
    selectedUsersType: typeof selectedUsers,
    selectedUsersIsArray: Array.isArray(selectedUsers),
    selectedUsersLength: selectedUsers?.length,
    onSelectionChange: typeof onSelectionChange
  });

  // Arrêt immédiat si les props sont invalides
  if (!users || !Array.isArray(users)) {
    console.error('CollaboratorsSelect: users prop is invalid:', users);
    return <div className="text-sm text-red-500">Erreur: données utilisateurs invalides</div>;
  }

  if (!selectedUsers || !Array.isArray(selectedUsers)) {
    console.error('CollaboratorsSelect: selectedUsers prop is invalid:', selectedUsers);
    return <div className="text-sm text-red-500">Erreur: sélection utilisateurs invalide</div>;
  }

  if (!onSelectionChange || typeof onSelectionChange !== 'function') {
    console.error('CollaboratorsSelect: onSelectionChange is not a function:', onSelectionChange);
    return <div className="text-sm text-red-500">Erreur: fonction de callback invalide</div>;
  }

  // Validation et nettoyage des données
  let validUsers;
  let validSelectedUsers;

  try {
    validUsers = users.filter(user => {
      const isValid = user && 
                     typeof user === 'object' && 
                     typeof user.id === 'string' && 
                     user.id.length > 0 &&
                     typeof user.email === 'string' &&
                     user.email.length > 0;
      if (!isValid) {
        console.warn('CollaboratorsSelect: Invalid user filtered out:', user);
      }
      return isValid;
    });

    validSelectedUsers = selectedUsers.filter(userId => {
      const isValid = typeof userId === 'string' && userId.length > 0;
      if (!isValid) {
        console.warn('CollaboratorsSelect: Invalid selected user ID filtered out:', userId);
      }
      return isValid;
    });
  } catch (error) {
    console.error('CollaboratorsSelect: Error during validation:', error);
    return <div className="text-sm text-red-500">Erreur lors de la validation des données</div>;
  }

  console.log('CollaboratorsSelect - Après validation:', { 
    validUsers: validUsers.length, 
    validSelectedUsers: validSelectedUsers.length,
    validUsersData: validUsers,
    validSelectedUsersData: validSelectedUsers
  });

  // Calcul des utilisateurs sélectionnés avec gestion d'erreur
  let selectedUsersData;
  try {
    selectedUsersData = validUsers.filter(user => {
      try {
        return validSelectedUsers.includes(user.id);
      } catch (error) {
        console.error('Error checking if user is selected:', error, { user, validSelectedUsers });
        return false;
      }
    });
    console.log('CollaboratorsSelect - selectedUsersData calculé:', selectedUsersData);
  } catch (error) {
    console.error('CollaboratorsSelect: Error calculating selectedUsersData:', error);
    selectedUsersData = [];
  }

  const toggleUser = (userId: string) => {
    console.log('toggleUser appelé avec:', userId);
    console.log('validSelectedUsers actuel:', validSelectedUsers);
    
    try {
      if (!userId || typeof userId !== 'string') {
        console.error('toggleUser: Invalid userId:', userId);
        return;
      }

      const newSelection = validSelectedUsers.includes(userId)
        ? validSelectedUsers.filter(id => id !== userId)
        : [...validSelectedUsers, userId];
      
      console.log('toggleUser - Nouvelle sélection:', newSelection);
      onSelectionChange(newSelection);
    } catch (error) {
      console.error('Erreur dans toggleUser:', error);
    }
  };

  const removeUser = (userId: string) => {
    console.log('removeUser appelé avec:', userId);
    try {
      if (!userId || typeof userId !== 'string') {
        console.error('removeUser: Invalid userId:', userId);
        return;
      }

      const newSelection = validSelectedUsers.filter(id => id !== userId);
      console.log('removeUser - Nouvelle sélection:', newSelection);
      onSelectionChange(newSelection);
    } catch (error) {
      console.error('Erreur dans removeUser:', error);
    }
  };

  // Protection supplémentaire avant le rendu
  if (!Array.isArray(validUsers) || !Array.isArray(validSelectedUsers) || !Array.isArray(selectedUsersData)) {
    console.error('CollaboratorsSelect: Arrays are not properly initialized', {
      validUsers: Array.isArray(validUsers),
      validSelectedUsers: Array.isArray(validSelectedUsers),
      selectedUsersData: Array.isArray(selectedUsersData)
    });
    return <div className="text-sm text-red-500">Erreur: données corrompues</div>;
  }

  return (
    <div className="flex flex-col gap-2">
      {selectedUsersData.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsersData.map((user) => {
            if (!user || !user.id) {
              console.error('CollaboratorsSelect: Invalid user in selectedUsersData:', user);
              return null;
            }
            
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
              console.error('Erreur lors du rendu du badge utilisateur:', error, user);
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
                if (!user || !user.id) {
                  console.error('CollaboratorsSelect: Invalid user in validUsers:', user);
                  return null;
                }
                
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
                  console.error('Erreur lors du rendu de l\'item utilisateur:', error, user);
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
