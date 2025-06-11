
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Filter, 
  Calendar, 
  Phone, 
  Eye, 
  EyeOff, 
  Table, 
  Grid, 
  Search, 
  X,
  User,
  Users
} from 'lucide-react';
import CategoryFilter from './CategoryFilter';

interface LeadsFiltersProps {
  selectedCategories: string[];
  setSelectedCategories: (categories: string[]) => void;
  visibleColumns: string[];
  setVisibleColumns: (columns: string[]) => void;
  selectedDateFilter: string;
  setSelectedDateFilter: (filter: string) => void;
  selectedContactFilter: string;
  setSelectedContactFilter: (filter: string) => void;
  selectedUserContactFilter?: string;
  setSelectedUserContactFilter?: (filter: string) => void;
  availableCategories: string[];
  showContactFilter?: boolean;
  showAssignmentColumn?: boolean;
  viewMode: 'table' | 'card';
  setViewMode: (mode: 'table' | 'card') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isAdmin?: boolean;
}

const LeadsFilters = ({
  selectedCategories,
  setSelectedCategories,
  visibleColumns,
  setVisibleColumns,
  selectedDateFilter,
  setSelectedDateFilter,
  selectedContactFilter,
  setSelectedContactFilter,
  selectedUserContactFilter = 'all',
  setSelectedUserContactFilter,
  availableCategories,
  showContactFilter = true,
  showAssignmentColumn = false,
  viewMode,
  setViewMode,
  searchQuery,
  setSearchQuery,
  isAdmin = false
}: LeadsFiltersProps) => {
  
  const dateFilterOptions = [
    { value: '24h', label: 'Dernières 24h' },
    { value: '48h', label: 'Dernières 48h' },
    { value: '7days', label: 'Derniers 7 jours' },
    { value: 'all', label: 'Tous' }
  ];

  const contactFilterOptions = [
    { value: 'exclude_none', label: 'Tous les leads' },
    { value: 'exclude_1week', label: 'Exclure contactés < 1 semaine' },
    { value: 'exclude_2weeks', label: 'Exclure contactés < 2 semaines' },
    { value: 'exclude_1month', label: 'Exclure contactés < 1 mois' },
    { value: 'exclude_all_contacted', label: 'Seulement non contactés' }
  ];

  const userContactFilterOptions = [
    { value: 'all', label: 'Tous les leads', icon: Users },
    { value: 'only_me', label: 'Mes contacts uniquement', icon: User },
    { value: 'exclude_me', label: 'Exclure mes contacts', icon: EyeOff }
  ];

  const getDefaultColumns = () => {
    const baseColumns = [
      'posted_date',
      'job_title', 
      'author_name', 
      'company', 
      'last_contact',
      'category', 
      'location'
    ];
    
    if (isAdmin) {
      baseColumns.splice(1, 0, 'last_updated');
    }

    if (showAssignmentColumn) {
      baseColumns.push('assignment');
    }
    
    return baseColumns;
  };

  const columnLabels: Record<string, string> = {
    posted_date: 'Date publication',
    last_updated: 'Dernière MAJ',
    job_title: 'Titre du poste',
    author_name: 'Nom',
    company: 'Entreprise',
    last_contact: 'Dernier contact',
    category: 'Catégorie',
    location: 'Localisation',
    assignment: 'Attribution'
  };

  const columnOptions = Object.keys(columnLabels);

  const getDateFilterLabel = (value: string) => {
    return dateFilterOptions.find(option => option.value === value)?.label || value;
  };

  const getContactFilterLabel = (value: string) => {
    return contactFilterOptions.find(option => option.value === value)?.label || value;
  };

  const getUserContactFilterLabel = (value: string) => {
    return userContactFilterOptions.find(option => option.value === value)?.label || value;
  };

  const hasActiveFilters = selectedCategories.length > 0 || 
                          selectedDateFilter !== 'all' || 
                          selectedContactFilter !== 'exclude_none' ||
                          selectedUserContactFilter !== 'all' ||
                          searchQuery.length > 0;

  const clearAllFilters = () => {
    setSelectedCategories([]);
    setSelectedDateFilter('all');
    setSelectedContactFilter('exclude_none');
    setSelectedUserContactFilter?.('all');
    setSearchQuery('');
  };

  return (
    <Card className="border-0 shadow-none bg-transparent">
      <CardContent className="p-0 space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, entreprise, titre ou localisation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchQuery('')}
              className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Filters row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Category filter */}
          <CategoryFilter
            availableCategories={availableCategories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
          />

          {/* Date filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Calendar className="h-4 w-4" />
                {getDateFilterLabel(selectedDateFilter)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {dateFilterOptions.map((option) => (
                <DropdownMenuItem
                  key={option.value}
                  onClick={() => setSelectedDateFilter(option.value)}
                  className={selectedDateFilter === option.value ? 'bg-accent' : ''}
                >
                  {option.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Contact filter */}
          {showContactFilter && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Phone className="h-4 w-4" />
                  Contact
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64">
                {contactFilterOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => setSelectedContactFilter(option.value)}
                    className={selectedContactFilter === option.value ? 'bg-accent' : ''}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* User contact filter */}
          {setSelectedUserContactFilter && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <User className="h-4 w-4" />
                  {getUserContactFilterLabel(selectedUserContactFilter)}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                {userContactFilterOptions.map((option) => {
                  const IconComponent = option.icon;
                  return (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setSelectedUserContactFilter(option.value)}
                      className={selectedUserContactFilter === option.value ? 'bg-accent' : ''}
                    >
                      <IconComponent className="h-4 w-4 mr-2" />
                      {option.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Columns visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Eye className="h-4 w-4" />
                Colonnes
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={() => setVisibleColumns(getDefaultColumns())}>
                Colonnes par défaut
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {columnOptions.map((column) => (
                <DropdownMenuItem
                  key={column}
                  onClick={() => {
                    if (visibleColumns.includes(column)) {
                      setVisibleColumns(visibleColumns.filter(col => col !== column));
                    } else {
                      setVisibleColumns([...visibleColumns, column]);
                    }
                  }}
                  className="flex items-center gap-2"
                >
                  {visibleColumns.includes(column) ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                  {columnLabels[column]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* View mode toggle */}
          <div className="flex border rounded-md">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="rounded-r-none border-r"
            >
              <Table className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="rounded-l-none"
            >
              <Grid className="h-4 w-4" />
            </Button>
          </div>

          {/* Clear all filters */}
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={clearAllFilters} className="gap-2">
              <X className="h-4 w-4" />
              Effacer les filtres
            </Button>
          )}
        </div>

        {/* Active filters display */}
        {(selectedCategories.length > 0 || searchQuery) && (
          <div className="flex flex-wrap gap-2">
            {selectedCategories.map((category) => (
              <Badge key={category} variant="secondary" className="gap-1">
                {category}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== category))}
                />
              </Badge>
            ))}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Recherche: {searchQuery}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => setSearchQuery('')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LeadsFilters;
