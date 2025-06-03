
import { useState } from 'react';
import { MessageSquare, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface TaskCommentInputProps {
  value: string;
  onChange: (comment: string) => void;
}

export const TaskCommentInput = ({ value, onChange }: TaskCommentInputProps) => {
  const [open, setOpen] = useState(false);
  const [tempComment, setTempComment] = useState(value);

  const handleSave = () => {
    onChange(tempComment);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="text-xs">
          <MessageSquare className="h-3 w-3 mr-1" />
          {value ? 'Modifier commentaire' : 'Ajouter commentaire'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="start">
        <div className="space-y-3">
          <h4 className="font-medium text-sm">Commentaire de la tâche</h4>
          <Textarea
            placeholder="Ajoutez un commentaire..."
            value={tempComment}
            onChange={(e) => setTempComment(e.target.value)}
            className="min-h-[80px]"
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSave}>
              <Save className="h-3 w-3 mr-1" />
              Sauvegarder
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
