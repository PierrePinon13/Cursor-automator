
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Save, Bookmark, Trash2, Eye } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useSavedViews, SavedView } from '@/hooks/useSavedViews';

interface SavedViewsButtonProps {
  selectedCategories: string[];
  visibleColumns: string[];
  selectedDateFilter: string;
  selectedContactFilter: string;
  viewMode: 'table' | 'card';
  onApplyView: (view: {
    selectedCategories: string[];
    visibleColumns: string[];
    selectedDateFilter: string;
    selectedContactFilter: string;
    viewMode: 'table' | 'card';
  }) => void;
}

const SavedViewsButton = ({
  selectedCategories,
  visibleColumns,
  selectedDateFilter,
  selectedContactFilter,
  viewMode,
  onApplyView,
}: SavedViewsButtonProps) => {
  const { savedViews, saveView, deleteView, applyView } = useSavedViews();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [viewName, setViewName] = useState('');

  const handleSaveView = () => {
    if (viewName.trim()) {
      saveView(
        viewName.trim(),
        selectedCategories,
        visibleColumns,
        selectedDateFilter,
        selectedContactFilter,
        viewMode
      );
      setViewName('');
      setIsDialogOpen(false);
    }
  };

  const handleApplyView = (view: SavedView) => {
    const viewConfig = applyView(view);
    onApplyView(viewConfig);
  };

  return (
    <>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-8">
              <Bookmark className="h-4 w-4 mr-2" />
              Mes vues enregistrées
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64" align="start">
            <DropdownMenuLabel>Vues enregistrées</DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            <DropdownMenuGroup>
              <DialogTrigger asChild>
                <DropdownMenuItem>
                  <Save className="h-4 w-4 mr-2" />
                  Enregistrer la vue actuelle
                </DropdownMenuItem>
              </DialogTrigger>
            </DropdownMenuGroup>
            
            {savedViews.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Vues sauvegardées</DropdownMenuLabel>
                {savedViews.map((view) => (
                  <DropdownMenuGroup key={view.id}>
                    <DropdownMenuItem
                      className="flex items-center justify-between pr-2"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <button
                        onClick={() => handleApplyView(view)}
                        className="flex items-center flex-1 text-left"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        {view.name}
                      </button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0 hover:bg-red-100"
                        onClick={() => deleteView(view.id)}
                      >
                        <Trash2 className="h-3 w-3 text-red-500" />
                      </Button>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                ))}
              </>
            )}
            
            {savedViews.length === 0 && (
              <DropdownMenuItem disabled>
                Aucune vue enregistrée
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enregistrer la vue actuelle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label htmlFor="view-name" className="text-sm font-medium">
                Nom de la vue
              </label>
              <Input
                id="view-name"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                placeholder="Ex: Vue clients tech"
                className="mt-1"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
              >
                Annuler
              </Button>
              <Button
                onClick={handleSaveView}
                disabled={!viewName.trim()}
              >
                Enregistrer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SavedViewsButton;
