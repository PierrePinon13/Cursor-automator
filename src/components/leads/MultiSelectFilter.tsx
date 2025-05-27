
import React, { useState } from 'react';
import { Check, ChevronDown, Settings2 } from 'lucide-react';
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
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (value: string) => {
    const newSelection = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];
    onSelectionChange(newSelection);
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    onSelectionChange(options.map(option => option.value));
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="h-8 bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm transition-all duration-200 ease-in-out"
        >
          <Settings2 className="h-4 w-4 mr-2 text-gray-600" />
          <span className="font-medium text-gray-700">{title}</span>
          <Badge 
            variant="secondary" 
            className="ml-2 h-5 px-2 bg-blue-100 text-blue-700 border-0 font-semibold text-xs rounded-full"
          >
            {selectedValues.length}
          </Badge>
          <ChevronDown className="ml-2 h-4 w-4 text-gray-500" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end" side="bottom">
        <DropdownMenuLabel className="flex items-center justify-between">
          {title}
          <div className="flex gap-2">
            {selectedValues.length !== options.length && (
              <Button
                variant="ghost"
                size="sm"
                className="h-auto p-0 text-xs"
                onClick={selectAll}
              >
                Tout sélectionner
              </Button>
            )}
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
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={selectedValues.includes(option.value)}
            onCheckedChange={() => handleToggle(option.value)}
            onSelect={(e) => e.preventDefault()}
          >
            {option.label}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelectFilter;
