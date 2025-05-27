
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
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
    console.log('Tentative de sélection utilisateur:', userId);
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
                onClick={(e) => {
                  e.stopPropagation();
                  removeUser(user.id);
                }}
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
          <div className="p-4">
            <div className="text-sm font-medium mb-3">
              Collaborateurs disponibles ({safeUsers.length})
            </div>
            
            {safeUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Aucun utilisateur disponible dans le système.
              </div>
            ) : (
              <div className="space-y-1">
                {safeUsers.map((user) => {
                  const isSelected = safeSelectedUsers.includes(user.id);
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-100 rounded-md border border-transparent hover:border-gray-200 transition-colors"
                      onClick={() => {
                        console.log('Clic sur utilisateur:', user);
                        toggleUser(user.id);
                      }}
                    >
                      <div className="flex items-center justify-center w-4 h-4">
                        <Check
                          className={cn(
                            "h-4 w-4 text-blue-600",
                            isSelected ? "opacity-100" : "opacity-0"
                          )}
                        />
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">
                          {getDisplayName(user)}
                        </div>
                        {user.full_name && user.email && (
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
            
            <div className="mt-4 pt-3 border-t border-gray-200">
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Fermer
              </Button>
            </div>
          </div>
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
