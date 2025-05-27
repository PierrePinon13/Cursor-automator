
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X, Loader2, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadAssignments } from '@/hooks/useLeadAssignments';

interface User {
  id: string;
  email: string;
  full_name: string | null;
}

interface LeadAssignmentSelectProps {
  leadId: string;
  clientId?: string | null;
  preAssignedUsers?: User[];
}

export function LeadAssignmentSelect({ 
  leadId, 
  clientId,
  preAssignedUsers = [] 
}: LeadAssignmentSelectProps) {
  const [open, setOpen] = useState(false);
  const [pendingActions, setPendingActions] = useState<Set<string>>(new Set());
  const { users, assignLeadToUser, unassignLeadFromUser, getAssignedUsers } = useLeadAssignments();

  // Obtenir les utilisateurs assignés à ce lead
  const assignedUsers = getAssignedUsers(leadId);
  const assignedUserIds = assignedUsers.map(u => u.id);

  // Si le lead a un client associé et qu'il n'y a pas encore d'assignations,
  // utiliser les collaborateurs pré-assignés du client
  const displayedUsers = assignedUsers.length > 0 ? assignedUsers : preAssignedUsers;
  const displayedUserIds = displayedUsers.map(u => u.id);

  const getDisplayName = (user: User) => {
    return user.full_name || user.email || 'Utilisateur inconnu';
  };

  const toggleUser = async (userId: string) => {
    setPendingActions(prev => new Set(prev).add(userId));
    
    try {
      if (assignedUserIds.includes(userId)) {
        await unassignLeadFromUser(leadId, userId);
      } else {
        await assignLeadToUser(leadId, userId);
      }
      setOpen(false);
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
    } finally {
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const removeUser = async (userId: string) => {
    setPendingActions(prev => new Set(prev).add(userId));
    
    try {
      await unassignLeadFromUser(leadId, userId);
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
    } finally {
      setPendingActions(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Affichage des collaborateurs assignés */}
      {displayedUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayedUsers.map((user) => {
            const userPending = pendingActions.has(user.id);
            const isActuallyAssigned = assignedUserIds.includes(user.id);
            
            return (
              <Badge 
                key={user.id} 
                variant={isActuallyAssigned ? "default" : "secondary"} 
                className="flex items-center gap-1"
              >
                {getDisplayName(user)}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 hover:bg-transparent"
                  disabled={userPending}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isActuallyAssigned) {
                      removeUser(user.id);
                    } else {
                      toggleUser(user.id);
                    }
                  }}
                >
                  {userPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <X className="h-3 w-3" />
                  )}
                </Button>
              </Badge>
            );
          })}
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
            size="sm"
          >
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              {assignedUsers.length > 0 
                ? `${assignedUsers.length} assigné(s)` 
                : preAssignedUsers.length > 0
                ? `${preAssignedUsers.length} pré-assigné(s)`
                : "Assigner"}
            </div>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-0">
          <div className="p-4">
            <div className="text-sm font-medium mb-3">
              Collaborateurs disponibles ({users.length})
            </div>
            
            {users.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                Aucun utilisateur disponible.
              </div>
            ) : (
              <div className="space-y-1">
                {users.map((user) => {
                  const isAssigned = assignedUserIds.includes(user.id);
                  const isPending = pendingActions.has(user.id);
                  
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 text-left rounded-md border transition-colors",
                        isPending
                          ? "opacity-50 cursor-not-allowed bg-gray-50"
                          : "hover:bg-gray-100 border-transparent hover:border-gray-200"
                      )}
                      disabled={isPending}
                      onClick={() => toggleUser(user.id)}
                    >
                      <div className="flex items-center justify-center w-4 h-4">
                        {isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : (
                          <Check
                            className={cn(
                              "h-4 w-4 text-blue-600",
                              isAssigned ? "opacity-100" : "opacity-0"
                            )}
                          />
                        )}
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
    </div>
  );
}
