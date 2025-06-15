
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LocationSelector } from './LocationSelector';

interface SelectedLocation {
  label: string;
}

interface JobSearchFiltersProps {
  filters: {
    keywords: string;
    location: SelectedLocation[];
    date_posted: string | number;
    sort_by: string;
  };
  onChange: (filters: any) => void;
}

// LinkedIn-like filter options (in days), non-empty string for "Any time"
const DATE_OPTIONS = [
  { label: "Any time", value: "any" },
  { label: "Past month", value: "30" },
  { label: "Past week", value: "7" },
  { label: "Past 24 hours", value: "1" }
];

export const JobSearchFilters = ({ filters, onChange }: JobSearchFiltersProps) => {
  const handleLocationChange = (locations: SelectedLocation[]) => {
    onChange({
      ...filters,
      location: locations
    });
  };

  // Handle date change, convert "any" to "" for no filter
  const handleDateChange = (value: string) => {
    onChange({ ...filters, date_posted: value === "any" ? "" : Number(value) });
  };

  // Always use string for Select value; "any" means all, otherwise stringified number
  const datePostedValue =
    filters.date_posted === "" || filters.date_posted === undefined
      ? "any"
      : String(filters.date_posted);

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
          value={datePostedValue}
          onValueChange={handleDateChange}
        >
          <SelectTrigger>
            <SelectValue
              // Affiche la bonne étiquette même en édition
              placeholder={
                DATE_OPTIONS.find(opt => opt.value === datePostedValue)?.label || "Any time"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {DATE_OPTIONS.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>
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
