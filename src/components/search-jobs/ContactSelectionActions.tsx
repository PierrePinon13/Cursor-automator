
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { MessageSquare, Eye, EyeOff } from 'lucide-react';

interface ContactSelectionActionsProps {
  selectedCount: number;
  visibleCount: number;
  hiddenCount: number;
  showHidden: boolean;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onToggleShowHidden: () => void;
  onBulkProspecting: () => void;
}

export const ContactSelectionActions = ({
  selectedCount,
  visibleCount,
  hiddenCount,
  showHidden,
  onSelectAll,
  onDeselectAll,
  onToggleShowHidden,
  onBulkProspecting
}: ContactSelectionActionsProps) => {
  return (
    <div className="flex items-center justify-between bg-gray-50 p-4 rounded-lg">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Checkbox
            id="select-all"
            checked={selectedCount === visibleCount && visibleCount > 0}
            onCheckedChange={(checked) => {
              if (checked) {
                onSelectAll();
              } else {
                onDeselectAll();
              }
            }}
          />
          <label htmlFor="select-all" className="text-sm font-medium">
            Tout sélectionner ({visibleCount})
          </label>
        </div>
        
        {selectedCount > 0 && (
          <Badge variant="default" className="bg-blue-600">
            {selectedCount} sélectionné{selectedCount > 1 ? 's' : ''}
          </Badge>
        )}

        {hiddenCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleShowHidden}
            className="flex items-center gap-2"
          >
            {showHidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            {showHidden ? 'Masquer' : 'Afficher'} les contacts masqués ({hiddenCount})
          </Button>
        )}
      </div>

      <Button
        onClick={onBulkProspecting}
        disabled={visibleCount === 0}
        className="flex items-center gap-2"
      >
        <MessageSquare className="h-4 w-4" />
        Contacter en page dédiée
      </Button>
    </div>
  );
};
