
import React from 'react';
import { Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DateRangeFilterProps {
  value: string;
  onChange: (value: string) => void;
}

export const DateRangeFilter = ({ value, onChange }: DateRangeFilterProps) => {
  return (
    <div className="flex items-center gap-2">
      <Calendar className="h-4 w-4 text-gray-500" />
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="Période d'affichage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 derniers jours</SelectItem>
          <SelectItem value="15">15 derniers jours</SelectItem>
          <SelectItem value="30">30 derniers jours</SelectItem>
          <SelectItem value="60">60 derniers jours</SelectItem>
          <SelectItem value="all">Toutes les tâches</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};
