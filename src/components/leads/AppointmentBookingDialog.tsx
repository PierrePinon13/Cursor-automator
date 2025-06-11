
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Calendar, Clock } from 'lucide-react';

interface AppointmentBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: {
    id: string;
    author_name: string;
  };
  onAppointmentBooked: () => void;
}

const AppointmentBookingDialog = ({ 
  open, 
  onOpenChange, 
  lead, 
  onAppointmentBooked 
}: AppointmentBookingDialogProps) => {
  const [appointmentDate, setAppointmentDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour booker un rendez-vous",
        variant: "destructive",
      });
      return;
    }

    if (!appointmentDate.trim()) {
      toast({
        title: "Erreur",
        description: "Veuillez sélectionner une date de rendez-vous",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Marquer le lead comme ayant une réponse positive
      const { error: leadUpdateError } = await supabase
        .from('leads')
        .update({
          positive_response_at: new Date().toISOString(),
          positive_response_by_user_id: user.id,
          positive_response_notes: notes.trim() || null,
          contacted_by_user_id: user.id,
          contacted_by_user_name: user.user_metadata?.full_name || user.email,
          last_contact_at: new Date().toISOString(),
          last_updated_at: new Date().toISOString()
        })
        .eq('id', lead.id);

      if (leadUpdateError) {
        console.error('❌ Error updating lead:', leadUpdateError);
        throw leadUpdateError;
      }

      // Créer le rendez-vous
      const { error: appointmentError } = await supabase
        .from('booked_appointments')
        .insert({
          lead_id: lead.id,
          booked_by_user_id: user.id,
          booked_by_user_name: user.user_metadata?.full_name || user.email,
          appointment_date: new Date(appointmentDate).toISOString(),
          notes: notes.trim() || null,
          status: 'scheduled'
        });

      if (appointmentError) {
        console.error('❌ Error creating appointment:', appointmentError);
        throw appointmentError;
      }

      toast({
        title: "Rendez-vous programmé",
        description: `Le rendez-vous avec ${lead.author_name} a été programmé avec succès.`,
      });

      onOpenChange(false);
      onAppointmentBooked();
      
      // Reset form
      setAppointmentDate('');
      setNotes('');

    } catch (error) {
      console.error('❌ Error booking appointment:', error);
      toast({
        title: "Erreur",
        description: "Impossible de programmer le rendez-vous. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setAppointmentDate('');
    setNotes('');
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-green-600" />
            Programmer un rendez-vous
          </AlertDialogTitle>
          <AlertDialogDescription>
            Marquer ce lead comme ayant répondu positivement et programmer un rendez-vous avec <strong>{lead.author_name}</strong>.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="appointment-date" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Date et heure du rendez-vous *
            </Label>
            <Input
              id="appointment-date"
              type="datetime-local"
              value={appointmentDate}
              onChange={(e) => setAppointmentDate(e.target.value)}
              className="w-full"
              min={new Date().toISOString().slice(0, 16)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appointment-notes">Notes (optionnel)</Label>
            <Textarea
              id="appointment-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ajoutez des notes sur le rendez-vous..."
              rows={3}
              className="resize-none"
            />
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={handleCancel} disabled={isSubmitting}>
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleSubmit}
            disabled={isSubmitting || !appointmentDate.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Programmation...' : 'Programmer le RDV'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default AppointmentBookingDialog;
