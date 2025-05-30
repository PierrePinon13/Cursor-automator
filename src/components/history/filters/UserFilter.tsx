
import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

interface UserFilterProps {
  filterBy: 'all' | 'mine';
  onFilterByChange: (value: 'all' | 'mine') => void;
}

interface Profile {
  id: string;
  full_name: string | null;
}

const UserFilter = ({ filterBy, onFilterByChange }: UserFilterProps) => {
  const [showUserSelect, setShowUserSelect] = useState(false);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [isDoubleClicked, setIsDoubleClicked] = useState(false);
  const userSelectRef = useRef<HTMLDivElement>(null);

  // Récupérer les profils utilisateur
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name')
        .order('full_name');
      
      if (error) {
        console.error('Error fetching profiles:', error);
        return;
      }
      
      setProfiles(data || []);
    };

    fetchProfiles();
  }, []);

  // Fermer le menu utilisateur quand on clique ailleurs
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userSelectRef.current && !userSelectRef.current.contains(event.target as Node)) {
        setShowUserSelect(false);
        setIsDoubleClicked(false);
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
      setIsDoubleClicked(true);
    }
  };

  const handleUserSelect = (userId: string) => {
    // Pour l'instant, on ferme juste le menu
    // On pourrait étendre la logique pour filtrer par utilisateur spécifique
    setShowUserSelect(false);
    setIsDoubleClicked(false);
  };

  return (
    <div className="relative" ref={userSelectRef}>
      <Button
        variant="outline"
        size="sm"
        onClick={handleUserFilterClick}
        onDoubleClick={handleUserFilterDoubleClick}
        className={cn(
          'h-6 px-2 rounded-md border text-xs transition-colors',
          isDoubleClicked
            ? 'bg-purple-100 border-purple-400 text-purple-800'
            : filterBy === 'mine' 
              ? 'bg-blue-100 border-blue-300 text-blue-700' 
              : 'bg-white border-gray-300 text-gray-600'
        )}
      >
        <div className="flex items-center gap-1">
          <User className={cn(
            'h-3 w-3', 
            isDoubleClicked 
              ? 'text-purple-800'
              : filterBy === 'mine' ? 'text-blue-700' : 'text-gray-400'
          )} />
          <Users className={cn(
            'h-3 w-3', 
            isDoubleClicked 
              ? 'text-purple-800'
              : filterBy === 'all' ? 'text-blue-700' : 'text-gray-400'
          )} />
        </div>
      </Button>
      
      {showUserSelect && (
        <div className="absolute top-full mt-1 z-50 bg-white border rounded-lg shadow-lg">
          <Select onValueChange={handleUserSelect}>
            <SelectTrigger className="w-48 h-8 text-xs">
              <SelectValue placeholder="Choisir un utilisateur" />
            </SelectTrigger>
            <SelectContent className="bg-white border shadow-lg z-50">
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.full_name || 'Utilisateur sans nom'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
};

export default UserFilter;
