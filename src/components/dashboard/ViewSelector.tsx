
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Users, MousePointer, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

type ViewType = 'personal' | 'global' | 'custom';

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface ViewSelectorProps {
  viewType: ViewType;
  selectedUserIds: string[];
  users: User[];
  onViewTypeChange: (type: ViewType) => void;
  onSelectedUsersChange: (userIds: string[]) => void;
}

export function ViewSelector({ 
  viewType, 
  selectedUserIds, 
  users, 
  onViewTypeChange, 
  onSelectedUsersChange 
}: ViewSelectorProps) {
  const [customMenuOpen, setCustomMenuOpen] = useState(false);

  const getDisplayName = (user: User) => {
    if (user.full_name) return user.full_name;
    
    const nameFromEmail = user.email.split('@')[0];
    const nameParts = nameFromEmail
      .split(/[._-]/)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase());
    
    return nameParts.join(' ');
  };

  const handleCustomUserToggle = (userId: string) => {
    const newSelection = selectedUserIds.includes(userId)
      ? selectedUserIds.filter(id => id !== userId)
      : [...selectedUserIds, userId];
    onSelectedUsersChange(newSelection);
  };

  const handleViewTypeClick = (type: ViewType) => {
    onViewTypeChange(type);
    if (type === 'custom') {
      setCustomMenuOpen(true);
    } else {
      setCustomMenuOpen(false);
    }
  };

  return (
    <div className="flex items-center border rounded-lg overflow-hidden">
      {/* Vue personnelle */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 rounded-none border-r",
          viewType === 'personal' ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
        )}
        onClick={() => handleViewTypeClick('personal')}
      >
        <User className="h-4 w-4" />
      </Button>

      {/* Vue globale */}
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-8 px-3 rounded-none border-r",
          viewType === 'global' ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
        )}
        onClick={() => handleViewTypeClick('global')}
      >
        <Users className="h-4 w-4" />
      </Button>

      {/* Sélection personnalisée */}
      <Popover open={customMenuOpen} onOpenChange={setCustomMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 px-3 rounded-none",
              viewType === 'custom' ? "bg-blue-100 text-blue-700" : "hover:bg-gray-100"
            )}
            onClick={() => handleViewTypeClick('custom')}
          >
            <MousePointer className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <div className="p-3 border-b">
            <h4 className="font-medium">Sélectionner des utilisateurs</h4>
            <p className="text-sm text-muted-foreground">
              {selectedUserIds.length} utilisateur{selectedUserIds.length > 1 ? 's' : ''} sélectionné{selectedUserIds.length > 1 ? 's' : ''}
            </p>
          </div>
          <ScrollArea className="h-[300px]">
            <div className="p-2">
              {users.map((user) => (
                <button
                  key={user.id}
                  onClick={() => handleCustomUserToggle(user.id)}
                  className="w-full flex items-center gap-2 px-2 py-2 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground"
                >
                  <Check
                    className={cn(
                      "h-4 w-4",
                      selectedUserIds.includes(user.id) ? "opacity-100" : "opacity-0"
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
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
}
