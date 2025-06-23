
import { Button } from '@/components/ui/button';
import { List, Building2 } from 'lucide-react';

interface JobOffersViewToggleProps {
  viewMode: 'list' | 'grouped';
  onViewModeChange: (mode: 'list' | 'grouped') => void;
}

export function JobOffersViewToggle({ viewMode, onViewModeChange }: JobOffersViewToggleProps) {
  return (
    <div className="flex bg-gray-100 rounded-lg p-1">
      <Button
        variant={viewMode === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('list')}
        className="flex items-center gap-2"
      >
        <List className="h-4 w-4" />
        Liste
      </Button>
      <Button
        variant={viewMode === 'grouped' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grouped')}
        className="flex items-center gap-2"
      >
        <Building2 className="h-4 w-4" />
        Par entreprise
      </Button>
    </div>
  );
}
