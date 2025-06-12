
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { StickyNote } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface SimpleNoteButtonProps {
  leadId: string;
  leadName: string;
}

const SimpleNoteButton = ({ leadId, leadName }: SimpleNoteButtonProps) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSaveNote = async () => {
    if (!note.trim() || !user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('activities')
        .insert({
          lead_id: leadId,
          activity_type: 'note',
          activity_data: {
            note: note.trim(),
            lead_name: leadName
          },
          performed_by_user_id: user.id
        });

      if (error) throw error;

      toast({
        title: "Note ajoutée",
        description: "Votre note a été sauvegardée avec succès.",
      });

      setNote('');
      setOpen(false);
    } catch (error) {
      console.error('Error saving note:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder la note.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        className="w-full h-10 justify-start bg-white hover:bg-yellow-50 border-yellow-200"
      >
        <div className="p-1 bg-yellow-100 rounded mr-3">
          <StickyNote className="h-4 w-4 text-yellow-600" />
        </div>
        Ajouter une note
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une note</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Lead concerné</label>
              <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
                {leadName}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Note</label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Écrivez votre note ici..."
                className="min-h-[100px]"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <Button 
                variant="outline" 
                onClick={() => setOpen(false)}
                className="flex-1"
              >
                Annuler
              </Button>
              <Button 
                onClick={handleSaveNote}
                disabled={!note.trim() || loading}
                className="flex-1"
              >
                {loading ? "Sauvegarde..." : "Sauvegarder"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SimpleNoteButton;
