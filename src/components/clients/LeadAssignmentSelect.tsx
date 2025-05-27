
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, X, Loader2, Users, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLeadAssignments } from '@/hooks/useLeadAssignments';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  // Obtenir les utilisateurs assignés à ce lead
  const assignedUsers = getAssignedUsers(leadId);
  const assignedUserIds = assignedUsers.map(u => u.id);

  const getDisplayName = (user: User) => {
    return user.full_name || user.email || 'Utilisateur inconnu';
  };

  // Effet pour créer automatiquement les assignations si le lead a un client avec des collaborateurs
  // mais qu'il n'y a pas encore d'assignations
  useEffect(() => {
    const autoAssignPreAssignedUsers = async () => {
      if (preAssignedUsers.length > 0 && assignedUsers.length === 0 && clientId) {
        console.log(`Auto-assignation pour le lead ${leadId} aux collaborateurs du client ${clientId}`);
        
        for (const user of preAssignedUsers) {
          try {
            await assignLeadToUser(leadId, user.id);
          } catch (error) {
            console.error(`Erreur lors de l'auto-assignation à ${user.email}:`, error);
          }
        }
        
        toast({
          title: "Assignation automatique",
          description: `Lead assigné automatiquement à ${preAssignedUsers.length} collaborateur(s) du client.`,
        });
      }
    };

    // Délai pour éviter les assignations multiples
    const timeoutId = setTimeout(autoAssignPreAssignedUsers, 500);
    return () => clearTimeout(timeoutId);
  }, [leadId, clientId, preAssignedUsers.length, assignedUsers.length]);

  const toggleUser = async (userId: string) => {
    setPendingActions(prev => new Set(prev).add(userId));
    
    try {
      if (assignedUserIds.includes(userId)) {
        await unassignLeadFromUser(leadId, userId);
        toast({
          title: "Assignation supprimée",
          description: "L'assignation a été supprimée avec succès.",
        });
      } else {
        await assignLeadToUser(leadId, userId);
        toast({
          title: "Lead assigné",
          description: "Le lead a été assigné avec succès.",
        });
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
      toast({
        title: "Assignation supprimée",
        description: "L'assignation a été supprimée avec succès.",
      });
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

  // Déterminer quels utilisateurs afficher et leur statut
  const displayUsers = assignedUsers.length > 0 ? assignedUsers : preAssignedUsers;
  const hasAutoAssignments = assignedUsers.length === 0 && preAssignedUsers.length > 0;

  return (
    <div className="flex flex-col gap-2">
      {/* Affichage des collaborateurs assignés ou pré-assignés */}
      {displayUsers.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {displayUsers.map((user) => {
            const userPending = pendingActions.has(user.id);
            const isActuallyAssigned = assignedUserIds.includes(user.id);
            
            return (
              <Badge 
                key={user.id} 
                variant={isActuallyAssigned ? "default" : "secondary"} 
                className={cn(
                  "flex items-center gap-1",
                  !isActuallyAssigned && hasAutoAssignments && "border-dashed opacity-75"
                )}
              >
                {!isActuallyAssigned && hasAutoAssignments && (
                  <UserPlus className="h-3 w-3" />
                )}
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
                      // Pour les pré-assignés, on les assigne vraiment
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
      
      {/* Indicateur pour les pré-assignations */}
      {hasAutoAssignments && (
        <div className="text-xs text-muted-foreground">
          <UserPlus className="h-3 w-3 inline mr-1" />
          Assignation automatique selon les collaborateurs du client
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
                  const isPreAssigned = preAssignedUsers.some(pu => pu.id === user.id);
                  
                  return (
                    <button
                      key={user.id}
                      type="button"
                      className={cn(
                        "w-full flex items-center space-x-3 p-3 text-left rounded-md border transition-colors",
                        isPending
                          ? "opacity-50 cursor-not-allowed bg-gray-50"
                          : "hover:bg-gray-100 border-transparent hover:border-gray-200",
                        isPreAssigned && !isAssigned && "bg-blue-50 border-blue-200"
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
                        <div className="font-medium text-gray-900 flex items-center gap-2">
                          {getDisplayName(user)}
                          {isPreAssigned && !isAssigned && (
                            <UserPlus className="h-3 w-3 text-blue-600" />
                          )}
                        </div>
                        {user.full_name && user.email && (
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        )}
                        {isPreAssigned && !isAssigned && (
                          <div className="text-xs text-blue-600">
                            Collaborateur du client
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
