
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface TaskStatusSelectProps {
  currentStatus: string;
  onStatusChange: (status: string) => void;
  disabled?: boolean;
}

export const TaskStatusSelect = ({ currentStatus, onStatusChange, disabled }: TaskStatusSelectProps) => {
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'en_attente':
        return { label: 'En attente', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'negatif':
        return { label: 'Négatif', color: 'bg-red-50 text-red-700 border-red-200' };
      case 'positif':
        return { label: 'Positif', color: 'bg-green-50 text-green-700 border-green-200' };
      case 'a_relancer':
        return { label: 'À relancer', color: 'bg-orange-50 text-orange-700 border-orange-200' };
      default:
        return { label: 'En attente', color: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  const currentDisplay = getStatusDisplay(currentStatus);

  if (disabled) {
    return (
      <Badge variant="outline" className={currentDisplay.color}>
        {currentDisplay.label}
      </Badge>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto p-1">
          <Badge variant="outline" className={`${currentDisplay.color} cursor-pointer hover:opacity-80`}>
            {currentDisplay.label}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Badge>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-40">
        <DropdownMenuItem onClick={() => onStatusChange('en_attente')}>
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 w-full justify-center">
            En attente
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange('negatif')}>
          <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 w-full justify-center">
            Négatif
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange('positif')}>
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 w-full justify-center">
            Positif
          </Badge>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onStatusChange('a_relancer')}>
          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 w-full justify-center">
            À relancer
          </Badge>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
