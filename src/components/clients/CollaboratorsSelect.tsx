
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

  // Logs de débogage
  console.log('CollaboratorsSelect props:', { 
    users: users, 
    selectedUsers: selectedUsers,
    usersType: typeof users,
    selectedUsersType: typeof selectedUsers,
    usersIsArray: Array.isArray(users),
    selectedUsersIsArray: Array.isArray(selectedUsers)
  });

  // Vérifications de sécurité strictes
  const safeUsers = Array.isArray(users) ? users : [];
  const safeSelectedUsers = Array.isArray(selectedUsers) ? selectedUsers : [];

  if (!Array.isArray(users) || !Array.isArray(selectedUsers)) {
    console.warn('CollaboratorsSelect: Invalid props received', { 
      users: users, 
      selectedUsers: selectedUsers,
      usersType: typeof users,
      selectedUsersType: typeof selectedUsers 
    });
    return (
      <div className="text-sm text-gray-500">
        Chargement des collaborateurs...
      </div>
    );
  }

  const selectedUsersData = safeUsers.filter(user => {
    if (!user || typeof user.id !== 'string') {
      console.warn('Invalid user object:', user);
      return false;
    }
    return safeSelectedUsers.includes(user.id);
  });

  const toggleUser = (userId: string) => {
    console.log('toggleUser called with:', userId);
    console.log('Current selectedUsers:', safeSelectedUsers);
    
    const newSelection = safeSelectedUsers.includes(userId)
      ? safeSelectedUsers.filter(id => id !== userId)
      : [...safeSelectedUsers, userId];
    
    console.log('New selection:', newSelection);
    onSelectionChange(newSelection);
  };

  const removeUser = (userId: string) => {
    console.log('removeUser called with:', userId);
    const newSelection = safeSelectedUsers.filter(id => id !== userId);
    console.log('New selection after removal:', newSelection);
    onSelectionChange(newSelection);
  };

  return (
    <div className="flex flex-col gap-2">
      {selectedUsersData.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedUsersData.map((user) => (
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
          ))}
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
            {safeSelectedUsers.length > 0 
              ? `${safeSelectedUsers.length} collaborateur(s)` 
              : "Ajouter des collaborateurs"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un utilisateur..." />
            <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
            <CommandGroup>
              {safeUsers.map((user) => {
                if (!user || typeof user.id !== 'string') {
                  console.warn('Skipping invalid user in map:', user);
                  return null;
                }
                
                return (
                  <CommandItem
                    key={user.id}
                    onSelect={() => toggleUser(user.id)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        safeSelectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
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
              })}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
