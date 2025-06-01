
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/hooks/useAuth';
import { useReminders } from '@/hooks/useReminders';
import { useToast } from '@/hooks/use-toast';

interface ReminderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: string;
  leadName: string;
}

const ReminderDialog = ({ open, onOpenChange, leadId, leadName }: ReminderDialogProps) => {
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [assignedUserId, setAssignedUserId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  
  const { users } = useUsers();
  const { user } = useAuth();
  const { createReminder } = useReminders();
  const { toast } = useToast();

  const handleCreateReminder = async () => {
    if (!selectedDate || !user) return;

    setLoading(true);
    try {
      const [hours, minutes] = selectedTime.split(':');
      const dueDate = new Date(selectedDate);
      dueDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      const targetUserId = assignedUserId || user.id;
      const isAssignedToSelf = targetUserId === user.id;

      await createReminder({
        type: 'reminder_due',
        target_user_id: targetUserId,
        lead_id: leadId,
        title: `Rappel - ${leadName}`,
        message: `Rappel programmé pour le lead ${leadName}`,
        due_date: dueDate.toISOString()
      });

      toast({
        title: "Rappel créé",
        description: `Rappel programmé pour le ${format(dueDate, 'PPP à HH:mm', { locale: fr })}${
          isAssignedToSelf ? '' : ` et assigné à ${users.find(u => u.id === targetUserId)?.full_name}`
        }`,
      });

      onOpenChange(false);
      setSelectedDate(undefined);
      setAssignedUserId('');
      setSelectedTime('09:00');
    } catch (error) {
      console.error('Error creating reminder:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le rappel.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Planifier un rappel</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Lead concerné</label>
            <div className="text-sm text-muted-foreground bg-muted p-2 rounded">
              {leadName}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Date du rappel</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? format(selectedDate, "PPP", { locale: fr }) : "Sélectionner une date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Heure</label>
            <Select value={selectedTime} onValueChange={setSelectedTime}>
              <SelectTrigger>
                <Clock className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 24 }, (_, i) => {
                  const hour = i.toString().padStart(2, '0');
                  return (
                    <SelectItem key={`${hour}:00`} value={`${hour}:00`}>
                      {hour}:00
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Assigner à</label>
            <Select value={assignedUserId} onValueChange={setAssignedUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Moi-même" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Moi-même</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.full_name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleCreateReminder}
              disabled={!selectedDate || loading}
              className="flex-1"
            >
              {loading ? "Création..." : "Créer le rappel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReminderDialog;
