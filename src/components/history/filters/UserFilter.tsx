
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserFilterProps {
  filterBy: 'all' | 'mine';
  onFilterByChange: (value: 'all' | 'mine') => void;
}

const UserFilter = ({ filterBy, onFilterByChange }: UserFilterProps) => {
  const [showUserSelect, setShowUserSelect] = useState(false);
  const userSelectRef = useRef<HTMLDivElement>(null);

  // Fermer le menu utilisateur quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
        setShowUserSelect(false);
      }
    };

    if (showUserSelect) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserSelect]);

  const handleUserFilterClick = () => {
    onFilterByChange(filterBy === 'all' ? 'mine' : 'all');
  };

  const handleUserFilterDoubleClick = () => {
    if (filterBy === 'mine') {
      setShowUserSelect(true);
    }
  };

  return (
    <div className="relative" ref={userSelectRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUserFilterClick}
        onDoubleClick={handleUserFilterDoubleClick}
        className={cn(
          'h-6 px-2 rounded-md border text-xs',
          filterBy === 'mine' 
            ? 'bg-blue-100 border-blue-300 text-blue-700' 
            : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <div className="flex items-center gap-1">
          <User className={cn('h-3 w-3', filterBy === 'mine' ? 'text-blue-700' : 'text-gray-400')} />
          <Users className={cn('h-3 w-3', filterBy === 'all' ? 'text-blue-700' : 'text-gray-400')} />
        </div>
      </Button>
      
      {showUserSelect && (
        <div className="absolute top-full mt-1 z-50 bg-white border rounded-lg shadow-lg">
          <Select onValueChange={() => setShowUserSelect(false)}>
            <SelectTrigger className="w-40 h-8 text-xs">
              <SelectValue placeholder="Choisir un utilisateur" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              <SelectItem value="current">Moi</SelectItem>
              <SelectItem value="user1">Utilisateur 1</SelectItem>
              <SelectItem value="user2">Utilisateur 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default UserFilter;
