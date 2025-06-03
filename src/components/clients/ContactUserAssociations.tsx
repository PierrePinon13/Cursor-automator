
import { useState } from 'react';
import { useContactUserAssociations } from '@/hooks/useContactUserAssociations';
import { useUsers } from '@/hooks/useUsers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Plus, X } from 'lucide-react';

interface ContactUserAssociationsProps {
  contactId: string;
  contactName: string;
}

export function ContactUserAssociations({ contactId, contactName }: ContactUserAssociationsProps) {
  const { associations, loading, addAssociation, removeAssociation } = useContactUserAssociations(contactId);
  const { users } = useUsers();
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddAssociation = async () => {
    if (!selectedUserId) return;
    
    setIsAdding(true);
    try {
      await addAssociation(selectedUserId);
      setSelectedUserId('');
    } finally {
      setIsAdding(false);
    }
  };

  const handleRemoveAssociation = async (associationId: string) => {
    await removeAssociation(associationId);
  };

  const getInitials = (fullName: string | null, email: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase();
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getDisplayName = (fullName: string | null, email: string) => {
    return fullName || email;
  };

  // Filtrer les utilisateurs déjà associés
  const availableUsers = users.filter(user => 
    !associations.some(assoc => assoc.user_id === user.id)
  );

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="h-4 w-4" />
        Chargement des associations...
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">Utilisateurs associés</span>
        <Badge variant="secondary" className="text-xs">
          {associations.length}
        </Badge>
      </div>

      {/* Liste des utilisateurs associés */}
      {associations.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {associations.map((association) => (
            <div
              key={association.id}
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2"
            >
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {getInitials(association.profiles.full_name, association.profiles.email)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium">
                {getDisplayName(association.profiles.full_name, association.profiles.email)}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveAssociation(association.id)}
                className="h-5 w-5 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">Aucun utilisateur associé</p>
      )}

      {/* Ajouter un utilisateur */}
      {availableUsers.length > 0 && (
        <div className="flex items-center gap-2">
          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger className="w-48 h-8">
              <SelectValue placeholder="Associer un utilisateur" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  <div className="flex items-center gap-2">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-xs">
                        {getInitials(user.full_name, user.email)}
                      </AvatarFallback>
                    </Avatar>
                    {getDisplayName(user.full_name, user.email)}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleAddAssociation}
            disabled={!selectedUserId || isAdding}
            size="sm"
            className="h-8"
          >
            <Plus className="h-3 w-3 mr-1" />
            Associer
          </Button>
        </div>
      )}
    </div>
  );
}
