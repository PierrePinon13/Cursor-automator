
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

export function CollaboratorsSelect({ users, selectedUsers, onSelectionChange }: CollaboratorsSelectProps) {
  const [open, setOpen] = useState(false);

  const selectedUsersData = users.filter(user => selectedUsers.includes(user.id));

  const toggleUser = (userId: string) => {
    const newSelection = selectedUsers.includes(userId)
      ? selectedUsers.filter(id => id !== userId)
      : [...selectedUsers, userId];
    
    onSelectionChange(newSelection);
  };

  const removeUser = (userId: string) => {
    onSelectionChange(selectedUsers.filter(id => id !== userId));
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
            {selectedUsers.length > 0 
              ? `${selectedUsers.length} collaborateur(s)` 
              : "Ajouter des collaborateurs"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <Command>
            <CommandInput placeholder="Rechercher un utilisateur..." />
            <CommandEmpty>Aucun utilisateur trouvé.</CommandEmpty>
            <CommandGroup>
              {users.map((user) => (
                <CommandItem
                  key={user.id}
                  onSelect={() => toggleUser(user.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selectedUsers.includes(user.id) ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col">
                    <span>{user.full_name || user.email}</span>
                    {user.full_name && (
                      <span className="text-sm text-gray-500">{user.email}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
