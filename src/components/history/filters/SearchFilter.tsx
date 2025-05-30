
import React from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

interface SearchFilterProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

const SearchFilter = ({ searchQuery, onSearchQueryChange }: SearchFilterProps) => {
  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-gray-400" />
      </div>
      <Input
        type="text"
        placeholder="Rechercher une activité..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
        className="pl-10 h-8 text-sm"
      />
    </div>
  );
};

export default SearchFilter;
