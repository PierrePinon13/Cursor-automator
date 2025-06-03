
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Check, ChevronDown, Users, User, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserSelection } from '@/hooks/useDashboardStats';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface UserSelectorProps {
  users: User[];
  selection: UserSelection;
  onSelectionChange: (selection: UserSelection) => void;
}

export function UserSelector({ users, selection, onSelectionChange }: UserSelectorProps) {
  const [open, setOpen] = useState(false);

  const getDisplayName = (user: User) => {
    if (user.full_name) return user.full_name;
    
    // Extract name from email (before @)
    const nameFromEmail = user.email.split('@')[0];
    
    // Convert formats like "prenom.nom" or "prenom_nom" to "Prénom Nom"
    const nameParts = nameFromEmail
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    
    return nameParts.join(' ');
  };

  const getSelectionLabel = () => {
    switch (selection.type) {
      case 'personal':
        return 'Mes stats';
      case 'global':
        return 'Vue globale';
      case 'specific':
        if (!selection.userIds?.length) return 'Sélectionner des utilisateurs';
        if (selection.userIds.length === 1) {
          const user = users.find(u => u.id === selection.userIds![0]);
          return user ? getDisplayName(user) : 'Utilisateur';
        }
        return `${selection.userIds.length} utilisateurs`;
      default:
        return 'Sélectionner';
    }
  };

  const getSelectionIcon = () => {
    switch (selection.type) {
      case 'personal':
        return <User className="h-4 w-4" />;
      case 'global':
        return <Globe className="h-4 w-4" />;
      case 'specific':
        return <Users className="h-4 w-4" />;
      default:
        return <Users className="h-4 w-4" />;
    }
  };

  const handleTypeChange = (type: UserSelection['type']) => {
    if (type === 'specific') {
      onSelectionChange({ type, userIds: [] });
    } else {
      onSelectionChange({ type });
    }
    setOpen(false);
  };

  const handleUserToggle = (userId: string) => {
    if (selection.type !== 'specific') return;

    const currentIds = selection.userIds || [];
    const newIds = currentIds.includes(userId)
      ? currentIds.filter(id => id !== userId)
      : [...currentIds, userId];

    onSelectionChange({ type: 'specific', userIds: newIds });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="justify-between min-w-[200px]"
        >
          <div className="flex items-center gap-2">
            {getSelectionIcon()}
            <span className="truncate">{getSelectionLabel()}</span>
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <ScrollArea className="h-[400px]">
          <div className="p-4">
            <div className="space-y-1">
              <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">Type de vue</div>
              
              <button
                onClick={() => handleTypeChange('personal')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    selection.type === 'personal' ? "opacity-100" : "opacity-0"
                  )}
                />
                <User className="h-4 w-4" />
                Mes statistiques
              </button>
              
              <button
                onClick={() => handleTypeChange('global')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    selection.type === 'global' ? "opacity-100" : "opacity-0"
                  )}
                />
                <Globe className="h-4 w-4" />
                Vue globale (tous)
              </button>
              
              <button
                onClick={() => handleTypeChange('specific')}
                className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
              >
                <Check
                  className={cn(
                    "h-4 w-4",
                    selection.type === 'specific' ? "opacity-100" : "opacity-0"
                  )}
                />
                <Users className="h-4 w-4" />
                Sélection personnalisée
              </button>

              {selection.type === 'specific' && users.length > 0 && (
                <>
                  <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground mt-4">
                    Utilisateurs ({users.length})
                  </div>
                  {users.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleUserToggle(user.id)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Check
                        className={cn(
                          "h-4 w-4",
                          selection.userIds?.includes(user.id) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col items-start">
                        <span className="font-medium">
                          {getDisplayName(user)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
