
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, X, Loader2 } from 'lucide-react';
import { useUsers } from '@/hooks/useUsers';
import { useClientCollaborators } from '@/hooks/useClientCollaborators';

interface CollaboratorsSelectProps {
  clientId: string;
}

export function CollaboratorsSelect({ clientId }: CollaboratorsSelectProps) {
  const [open, setOpen] = useState(false);
  const { users, loading: usersLoading } = useUsers();
  const { collaboratorIds, loading: collaboratorsLoading, updateCollaborators } = useClientCollaborators(clientId);

  console.log('🎯 CollaboratorsSelect render:', {
    clientId,
    usersCount: users.length,
    collaboratorIds,
    usersLoading,
    collaboratorsLoading
  });

  // Trouver les utilisateurs sélectionnés
  const selectedUsers = users.filter(user => collaboratorIds.includes(user.id));
  
  // Filtrer les utilisateurs disponibles (non sélectionnés)
  const availableUsers = users.filter(user => !collaboratorIds.includes(user.id));

  const addUser = async (userId: string) => {
    console.log('➕ Adding user:', userId);
    const newSelection = [...collaboratorIds, userId];
    setOpen(false);
    
    try {
      await updateCollaborators(newSelection);
    } catch (error) {
      console.error('Erreur lors de l\'ajout:', error);
    }
  };

  const removeUser = async (userId: string) => {
    console.log('➖ Removing user:', userId);
    const newSelection = collaboratorIds.filter(id => id !== userId);
    
    try {
      await updateCollaborators(newSelection);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    }
  };

  const getDisplayName = (user: any) => {
    if (user.full_name) return user.full_name;
    
    // Extract name from email (before @)
    const nameFromEmail = user.email.split('@')[0];
    
    // Convert formats like "prenom.nom" or "prenom_nom" to "Prénom Nom"
    const nameParts = nameFromEmail
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    
    return nameParts.join(' ');
  };

  const getInitials = (user: any) => {
    const name = getDisplayName(user);
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2);
  };

  if (usersLoading || collaboratorsLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-gray-500">Chargement...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Affichage des collaborateurs sélectionnés */}
      {selectedUsers.map((user) => (
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
            disabled={collaboratorsLoading}
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
            disabled={collaboratorsLoading || availableUsers.length === 0}
          >
            {collaboratorsLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0">
          <div className="p-3">
            <div className="text-sm font-medium mb-2">
              Ajouter un collaborateur ({users.length})
            </div>
            
            {users.length === 0 ? (
              <div className="text-sm text-muted-foreground text-red-600">
                ⚠️ Aucun utilisateur trouvé.
              </div>
            ) : availableUsers.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Tous les utilisateurs sont déjà assignés.
              </div>
            ) : (
              <ScrollArea className="h-[200px]">
                <div className="space-y-1">
                  {availableUsers.map((user) => (
                    <button
                      key={user.id}
                      type="button"
                      className="w-full flex items-center space-x-2 p-2 text-left rounded-md border transition-colors hover:bg-gray-100 hover:border-gray-200"
                      onClick={() => addUser(user.id)}
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="bg-blue-500 text-white text-xs">
                          {getInitials(user)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-gray-900 text-sm truncate">
                          {getDisplayName(user)}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {user.email}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
            
            <div className="mt-3 pt-2 border-t border-gray-200">
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
