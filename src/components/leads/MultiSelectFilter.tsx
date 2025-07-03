import React, { useState } from 'react';
import { Check, ChevronDown, Settings2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface MultiSelectFilterProps {
  title: string;
  options: { value: string; label: string }[];
  selectedValues: string[];
  onSelectionChange: (values: string[]) => void;
  singleSelect?: boolean; // Nouveau prop pour gérer les sélections uniques
}

const MultiSelectFilter = ({
  title,
  options,
  selectedValues,
  onSelectionChange,
  singleSelect = false,
}: MultiSelectFilterProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleToggle = (value: string) => {
    if (singleSelect) {
      // Pour les sélections uniques, remplacer directement la valeur
      onSelectionChange([value]);
      setIsOpen(false); // Fermer le dropdown après sélection
    } else {
      // Pour les sélections multiples, toggle la valeur
      const newSelection = selectedValues.includes(value)
        ? selectedValues.filter(v => v !== value)
        : [...selectedValues, value];
      onSelectionChange(newSelection);
    }
  };

  const clearAll = () => {
    onSelectionChange([]);
  };

  const selectAll = () => {
    onSelectionChange(options.map(option => option.value));
  };

  const selectedCount = selectedValues.length;
  const totalCount = options.length;

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 bg-gray-50 border-0 border-b border-gray-200 rounded-none px-4 text-gray-700 font-medium flex items-center gap-2 shadow-none hover:bg-gray-100"
        >
          <Settings2 className="h-4 w-4 mr-2 text-gray-500" />
          <span>{title}</span>
          <Badge
            variant="secondary"
            className="ml-2 h-5 px-2 bg-gray-200 text-gray-700 border-0 font-semibold text-xs rounded-full"
          >
            {singleSelect ? (selectedCount > 0 ? '1' : '0') : selectedCount}
          </Badge>
          <ChevronDown className="ml-2 h-4 w-4 text-gray-400" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64 bg-white shadow-lg z-50 border border-gray-200" align="end" side="bottom">
        <DropdownMenuLabel className="flex items-center justify-between">
          {title}
          {!singleSelect && (
            <div className="flex gap-2">
              {selectedCount !== totalCount && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-blue-600 hover:text-blue-800"
                  onClick={selectAll}
                >
                  Tout sélectionner
                </Button>
              )}
              {selectedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 text-xs text-gray-600 hover:text-gray-800"
                  onClick={clearAll}
                >
                  Tout effacer
                </Button>
              )}
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-y-auto">
          {options.map((option) => (
            singleSelect ? (
              <DropdownMenuItem
                key={option.value}
                className="cursor-pointer flex items-center justify-between"
                onClick={() => handleToggle(option.value)}
              >
                <span>{option.label}</span>
                {selectedValues.includes(option.value) && (
                  <Check className="h-4 w-4 text-blue-600" />
                )}
              </DropdownMenuItem>
            ) : (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => handleToggle(option.value)}
                onSelect={(e) => e.preventDefault()}
                className="cursor-pointer"
              >
                {option.label}
              </DropdownMenuCheckboxItem>
            )
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default MultiSelectFilter;
