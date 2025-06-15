import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSelector } from './LocationSelector';

interface SelectedLocation {
  label: string;
  geoId: number | null;
  isResolved: boolean;
}

interface JobSearchFiltersProps {
  filters: {
    keywords: string;
    location: SelectedLocation[];
    date_posted: string;
    sort_by: string;
  };
  onChange: (filters: any) => void;
}

const DATE_OPTIONS = [
  { label: "Toutes les dates", value: "" },
  { label: "Dernières 24h", value: 86400 },
  { label: "Dernières 48h", value: 172800 },
  { label: "Derniers 7 jours", value: 604800 },
  { label: "Derniers 14 jours", value: 1209600 },
  { label: "Derniers 30 jours", value: 2592000 },
];

export const JobSearchFilters = ({ filters, onChange }: JobSearchFiltersProps) => {
  const handleLocationChange = (locations: SelectedLocation[]) => {
    onChange({
      ...filters,
      location: locations
    });
  };

  const handleDateChange = (value: number | "") => {
    onChange({ ...filters, date_posted: value });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Mots-clés */}
      <div className="lg:col-span-2">
        <Label htmlFor="keywords">Mots-clés *</Label>
        <Input
          id="keywords"
          placeholder="Ex: développeur react, product manager..."
          value={filters.keywords}
          onChange={(e) => onChange({ ...filters, keywords: e.target.value })}
        />
      </div>

      {/* Localisation avec auto-complétion */}
      <div className="lg:col-span-2">
        <LocationSelector
          selectedLocations={filters.location}
          onChange={handleLocationChange}
        />
      </div>

      {/* Date de publication */}
      <div>
        <Label htmlFor="date_posted">Date de publication</Label>
        <Select
          value={filters.date_posted === "" ? "" : String(filters.date_posted)}
          onValueChange={(value) => handleDateChange(value === "" ? "" : Number(value))}
        >
          <SelectTrigger>
            {/* Placeholder pour "Toutes les dates" */}
            <SelectValue placeholder="Toutes les dates" />
          </SelectTrigger>
          <SelectContent>
            {/* Ne pas rendre l’item avec value="" */}
            {DATE_OPTIONS.filter(opt => opt.value !== "")
              .map(opt => (
                <SelectItem key={opt.value} value={String(opt.value)}>
                  {opt.label}
                </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Tri */}
      <div>
        <Label htmlFor="sort_by">Trier par</Label>
        <Select value={filters.sort_by} onValueChange={(value) => onChange({ ...filters, sort_by: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="date">Date (plus récent)</SelectItem>
            <SelectItem value="relevance">Pertinence</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};
