import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Calendar } from "@/components/ui/calendar"
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { format } from "date-fns"
import { fr } from 'date-fns/locale';
import { cn } from "@/lib/utils"

interface CategoryFilterProps {
  availableCategories: string[];
  selectedCategories: string[];
  onSelectedCategoriesChange: (categories: string[]) => void;
}

interface DateFilterProps {
  selectedDateFilter: string;
  onSelectedDateFilterChange: (dateFilter: string) => void;
}

interface ContactFilterProps {
  selectedContactFilter: string;
  onSelectedContactFilterChange: (contactFilter: string) => void;
}

interface UserContactFilterProps {
  selectedUserContactFilter: string;
  onSelectedUserContactFilterChange: (userContactFilter: string) => void;
}

interface AssignmentColumnProps {
  showAssignmentColumn: boolean;
  onShowAssignmentColumnChange: (showAssignmentColumn: boolean) => void;
}

interface ViewModeProps {
  viewMode: 'table' | 'card';
  onViewModeChange: (viewMode: 'table' | 'card') => void;
}

interface SearchProps {
  searchQuery: string;
  onSearchQueryChange: (searchQuery: string) => void;
}

interface LeadsFiltersProps {
  availableCategories: string[];
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (dateFilter: string) => void;
  selectedContactFilter: string;
  setSelectedContactFilter: (contactFilter: string) => void;
  selectedUserContactFilter: string;
  setSelectedUserContactFilter: (userContactFilter: string) => void;
  showContactFilter: boolean;
  showAssignmentColumn: boolean;
  viewMode: 'table' | 'card';
  setViewMode: (viewMode: 'table' | 'card') => void;
  searchQuery: string;
  setSearchQuery: (searchQuery: string) => void;
  isAdmin: boolean;
}

const CategoryFilter: React.FC<CategoryFilterProps> = ({ availableCategories, selectedCategories, onSelectedCategoriesChange }) => {
  const handleCategoryChange = (category: string) => {
    if (selectedCategories.includes(category)) {
      onSelectedCategoriesChange(selectedCategories.filter((c) => c !== category));
    } else {
      onSelectedCategoriesChange([...selectedCategories, category]);
    }
  };

  return (
    <div className="space-y-2">
      <Label>Catégories:</Label>
      <div className="flex flex-wrap gap-2">
        {availableCategories.map((category) => (
          <button
            key={category}
            className={`px-3 py-1 rounded-full text-sm font-medium ${selectedCategories.includes(category)
              ? 'bg-blue-500 text-white'
              : 'bg-gray-200 text-gray-700'
              } hover:bg-blue-300 transition-colors`}
            onClick={() => handleCategoryChange(category)}
          >
            {category}
          </button>
        ))}
      </div>
    </div>
  );
};

const DateFilter: React.FC<DateFilterProps> = ({ selectedDateFilter, onSelectedDateFilterChange }) => {
  return (
    <div className="space-y-2">
      <Label>Date:</Label>
      <Select value={selectedDateFilter} onValueChange={onSelectedDateFilterChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Sélectionner une période" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes les dates</SelectItem>
          <SelectItem value="24h">Dernières 24 heures</SelectItem>
          <SelectItem value="48h">Dernières 48 heures</SelectItem>
          <SelectItem value="7days">7 derniers jours</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const ContactFilter: React.FC<ContactFilterProps> = ({ selectedContactFilter, onSelectedContactFilterChange }) => {
  return (
    <div className="space-y-2">
      <Label>Contact:</Label>
      <Select value={selectedContactFilter} onValueChange={onSelectedContactFilterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filtrer par contact" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="exclude_none">Ne pas exclure</SelectItem>
          <SelectItem value="exclude_1week">Exclure contactés il y a 1 semaine</SelectItem>
          <SelectItem value="exclude_2weeks">Exclure contactés il y a 2 semaines</SelectItem>
          <SelectItem value="exclude_1month">Exclure contactés il y a 1 mois</SelectItem>
          <SelectItem value="exclude_all_contacted">Exclure tous les contactés</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const UserContactFilter: React.FC<UserContactFilterProps> = ({ selectedUserContactFilter, onSelectedUserContactFilterChange }) => {
  return (
    <div className="space-y-2">
      <Label>Mes Contacts:</Label>
      <Select value={selectedUserContactFilter} onValueChange={onSelectedUserContactFilterChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Filtrer par mes contacts" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous les contacts</SelectItem>
          <SelectItem value="only_me">Seulement mes contacts</SelectItem>
          <SelectItem value="exclude_me">Exclure mes contacts</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const AssignmentColumn: React.FC<AssignmentColumnProps> = ({ showAssignmentColumn, onShowAssignmentColumnChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <Label htmlFor="showAssignmentColumn">Afficher la colonne d'assignation</Label>
      <Switch id="showAssignmentColumn" checked={showAssignmentColumn} onCheckedChange={onShowAssignmentColumnChange} />
    </div>
  );
};

const ViewModeSelector: React.FC<ViewModeProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="space-y-2">
      <Label>Mode d'affichage:</Label>
      <Select value={viewMode} onValueChange={onViewModeChange}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Sélectionner un mode" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="table">Tableau</SelectItem>
          <SelectItem value="card">Cartes</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
};

const SearchBar: React.FC<SearchProps> = ({ searchQuery, onSearchQueryChange }) => {
  return (
    <div className="space-y-2">
      <Label htmlFor="search">Rechercher:</Label>
      <Input
        type="text"
        id="search"
        placeholder="Rechercher un lead..."
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />
    </div>
  );
};

const LeadsFilters: React.FC<LeadsFiltersProps> = ({
  availableCategories,
  selectedCategories,
  setSelectedCategories,
  visibleColumns,
  setVisibleColumns,
  selectedDateFilter,
  setSelectedDateFilter,
  selectedContactFilter,
  setSelectedContactFilter,
  selectedUserContactFilter,
  setSelectedUserContactFilter,
  showContactFilter,
  showAssignmentColumn,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  isAdmin
}) => {
  const [open, setOpen] = React.useState(false)

  const handleColumnToggle = (column: string) => {
    if (visibleColumns.includes(column)) {
      setVisibleColumns(visibleColumns.filter((c) => c !== column));
    } else {
      setVisibleColumns([...visibleColumns, column]);
    }
  };

  const allColumns = [
    { key: 'posted_date', label: 'Date' },
    { key: 'job_title', label: 'Titre' },
    { key: 'author_name', label: 'Auteur' },
    { key: 'company', label: 'Entreprise' },
    { key: 'last_contact', label: 'Dernier contact' },
    { key: 'category', label: 'Catégorie' },
    { key: 'location', label: 'Localisation' },
  ];

  if (isAdmin) {
    allColumns.splice(1, 0, { key: 'last_updated', label: 'Mis à jour' });
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <SearchBar searchQuery={searchQuery} onSearchQueryChange={setSearchQuery} />
      <CategoryFilter
        availableCategories={availableCategories}
        selectedCategories={selectedCategories}
        onSelectedCategoriesChange={setSelectedCategories}
      />
      <DateFilter selectedDateFilter={selectedDateFilter} onSelectedDateFilterChange={setSelectedDateFilter} />
      {showContactFilter && (
        <ContactFilter selectedContactFilter={selectedContactFilter} onSelectedContactFilterChange={setSelectedContactFilter} />
      )}
       {showContactFilter && (
        <UserContactFilter selectedUserContactFilter={selectedUserContactFilter} onSelectedUserContactFilterChange={setSelectedUserContactFilter} />
      )}
      <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />

      <div>
        <Label>Colonnes visibles:</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger className='w-full'>
            <Button variant="outline" role="combobox" aria-expanded={open} className='w-full justify-start'>
              Sélectionner les colonnes
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0">
            <div className='p-4'>
              <Label>Choisir les colonnes à afficher</Label>
            </div>
            <Separator />
            <div className='p-4 space-y-2'>
              {allColumns.map((column) => (
                <div key={column.key} className="flex items-center space-x-2">
                  <Switch
                    id={column.key}
                    checked={visibleColumns.includes(column.key)}
                    onCheckedChange={() => handleColumnToggle(column.key)}
                  />
                  <Label htmlFor={column.key}>{column.label}</Label>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export default LeadsFilters;
