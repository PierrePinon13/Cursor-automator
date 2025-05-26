
import React from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MultiSelectFilterProps {
  title: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
}

const MultiSelectFilter = ({
  title,
  options,
  selectedValues,
  onSelectionChange,
}: MultiSelectFilterProps) => {
  const handleToggle = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          {title}
          {selectedValues.length > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 w-5 rounded-full p-0 text-xs">
              {selectedValues.length}
            </Badge>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start">
        <DropdownMenuLabel className="flex items-center justify-between">
          {title}
          {selectedValues.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={clearAll}
            >
              Tout effacer
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={() => handleToggle(option.value)}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelectFilter;
