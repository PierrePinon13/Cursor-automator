
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

interface SimpleAppointmentDialogProps {
  leadId: string;
  leadName?: string;
  onSuccess?: () => void;
}

const SimpleAppointmentDialog = ({ leadId, leadName, onSuccess }: SimpleAppointmentDialogProps) => {
  const [open, setOpen] = useState(false);
  const [appointmentDate, setAppointmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appointmentDate) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date et heure",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Créer le rendez-vous
      const { error: appointmentError } = await supabase
        .from('booked_appointments')
        .insert({
          lead_id: leadId,
          booked_by_user_id: user.id,
          booked_by_user_name: user.email || 'Utilisateur',
          appointment_date: appointmentDate,
          notes: notes.trim() || null,
          status: 'scheduled'
        });

      if (appointmentError) throw appointmentError;

      // Marquer le lead comme ayant un RDV
      const { error: leadError } = await supabase
        .from('leads')
        .update({
          has_booked_appointment: true,
          appointment_booked_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString()
        })
        .eq('id', leadId);

      if (leadError) throw leadError;

      toast({
        title: "Rendez-vous programmé",
        description: `Rendez-vous programmé avec ${leadName || 'ce prospect'}`,
      });

      setOpen(false);
      setAppointmentDate('');
      setNotes('');
      onSuccess?.();
    } catch (error) {
      console.error('Error booking appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de programmer le rendez-vous",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Calendar className="h-4 w-4" />
          Programmer RDV
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Programmer un rendez-vous</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lead-name">Prospect</Label>
            <Input
              id="lead-name"
              value={leadName || 'Prospect'}
              disabled
              className="bg-gray-50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="appointment-date">Date et heure du rendez-vous</Label>
            <Input
              id="appointment-date"
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              min={new Date().toISOString().slice(0, 16)}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optionnel)</Label>
            <Textarea
              id="notes"
              placeholder="Ajoutez des notes sur ce rendez-vous..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
          
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Programmation...' : 'Programmer'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default SimpleAppointmentDialog;
