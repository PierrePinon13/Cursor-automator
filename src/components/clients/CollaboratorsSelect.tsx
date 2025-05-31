
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, X, Loader2 } from 'lucide-react';
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
  isLoading?: boolean;
}

export function CollaboratorsSelect({ 
  users = [], 
  selectedUsers = [], 
  onSelectionChange,
  isLoading = false
}: CollaboratorsSelectProps) {
  const [open, setOpen] = useState(false);
  const [localSelectedUsers, setLocalSelectedUsers] = useState(selectedUsers);

  // Validation et sécurisation des données
  const safeUsers = Array.isArray(users) ? users.filter(user => 
    user && 
    user.id && 
    (user.full_name || user.email)
  ) : [];

  const safeSelectedUsers = Array.isArray(localSelectedUsers) ? localSelectedUsers.filter(id => 
    id && typeof id === 'string'
  ) : [];

  if (!onSelectionChange || typeof onSelectionChange !== 'function') {
    return <div className="text-sm text-red-500">Erreur de configuration</div>;
  }

  // Trouver les utilisateurs sélectionnés
  const selectedUsersData = safeUsers.filter(user => 
    safeSelectedUsers.includes(user.id)
  );

  const addUser = async (userId: string) => {
    const newSelection = [...safeSelectedUsers, userId];
    setLocalSelectedUsers(newSelection);
    setOpen(false);
    
    try {
      await onSelectionChange(newSelection);
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
      setLocalSelectedUsers(safeSelectedUsers);
    }
  };

  const removeUser = async (userId: string) => {
    const newSelection = safeSelectedUsers.filter(id => id !== userId);
    setLocalSelectedUsers(newSelection);
    
    try {
      await onSelectionChange(newSelection);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      setLocalSelectedUsers(safeSelectedUsers);
    }
  };

  const getDisplayName = (user: User) => {
    return user.full_name || user.email || 'Utilisateur inconnu';
  };

  const getInitials = (user: User) => {
    const name = user.full_name || user.email || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };

  const availableUsers = safeUsers.filter(user => 
    !safeSelectedUsers.includes(user.id)
  );

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Affichage des collaborateurs sélectionnés */}
      {selectedUsersData.map((user) => (
        <div key={user.id} className="flex items-center gap-1 bg-gray-100 rounded-full pr-1 pl-1">
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-xs bg-blue-500 text-white">
              {getInitials(user)}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm px-1">{getDisplayName(user)}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 hover:bg-red-100 rounded-full"
            disabled={isLoading}
            onClick={() => removeUser(user.id)}
          >
            <X className="h-3 w-3 text-red-500" />
          </Button>
        </div>
      ))}
      
      {/* Bouton d'ajout */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="h-8 w-8 p-0 rounded-full border-dashed"
            disabled={isLoading || availableUsers.length === 0}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <div className="p-4">
            <div className="text-sm font-medium mb-3">
              Ajouter un collaborateur
            </div>
            
            {availableUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Tous les utilisateurs sont déjà assignés.
              </div>
            ) : (
              <div className="space-y-1">
                {availableUsers.map((user) => (
                  <button
                    key={user.id}
                    type="button"
                    className="w-full flex items-center space-x-3 p-3 text-left rounded-md border transition-colors hover:bg-gray-100 hover:border-gray-200"
                    onClick={() => addUser(user.id)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-500 text-white">
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>
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
                ))}
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
    </div>
  );
}
