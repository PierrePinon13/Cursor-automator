
import { useState } from 'react';
import { Calendar, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface FollowUpDatePickerProps {
  value: Date | null;
  onChange: (date: Date | null) => void;
  onAsapSelect: () => void;
}

export const FollowUpDatePicker = ({ value, onChange, onAsapSelect }: FollowUpDatePickerProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs">
          <CalendarDays className="h-3 w-3 mr-1" />
          {value ? format(value, 'dd/MM/yyyy', { locale: fr }) : 'Choisir une date'}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-3 border-b">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onAsapSelect();
              setOpen(false);
            }}
            className="w-full"
          >
            Dès que possible
          </Button>
        </div>
        <CalendarComponent
          mode="single"
          selected={value || undefined}
          onSelect={(date) => {
            onChange(date || null);
            setOpen(false);
          }}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
