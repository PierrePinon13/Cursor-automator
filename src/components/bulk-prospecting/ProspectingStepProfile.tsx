
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { User, Search, Filter, Users } from 'lucide-react';

interface JobData {
  id: string;
  title: string;
  company: string;
  personas: any[];
}

interface ProspectingStepProfileProps {
  jobData: JobData;
  selectedPersonas: any[];
  onSelectionChange: (personas: any[]) => void;
}

export const ProspectingStepProfile = ({ 
  jobData, 
  selectedPersonas, 
  onSelectionChange 
}: ProspectingStepProfileProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySelected, setShowOnlySelected] = useState(false);

  const filteredPersonas = jobData.personas.filter(persona => {
    const matchesSearch = !searchTerm || 
      persona.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      persona.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (persona.company && persona.company.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = !showOnlySelected || 
      selectedPersonas.some(selected => selected.id === persona.id);
    
    return matchesSearch && matchesFilter;
  });

  const togglePersona = (persona: any) => {
    const isSelected = selectedPersonas.some(selected => selected.id === persona.id);
    
    if (isSelected) {
      onSelectionChange(selectedPersonas.filter(selected => selected.id !== persona.id));
    } else {
      onSelectionChange([...selectedPersonas, persona]);
    }
  };

  const selectAll = () => {
    onSelectionChange(filteredPersonas);
  };

  const deselectAll = () => {
    onSelectionChange([]);
  };

  const handleShowOnlySelectedChange = (checked: boolean | "indeterminate") => {
    setShowOnlySelected(checked === true);
  };

  return (
    <div className="space-y-4">
      {/* En-tête compacte */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Users className="h-5 w-5" />
            Sélection des profils à prospecter
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            {filteredPersonas.length} profil(s) trouvé(s) pour cette offre
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={selectAll}>
            Tout sélectionner
          </Button>
          <Button variant="outline" size="sm" onClick={deselectAll}>
            Tout désélectionner
          </Button>
        </div>
      </div>

      {/* Filtres compacts */}
      <Card className="border-gray-200">
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Rechercher par nom, poste ou entreprise..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="show-selected"
                checked={showOnlySelected}
                onCheckedChange={handleShowOnlySelectedChange}
              />
              <label htmlFor="show-selected" className="text-sm whitespace-nowrap">
                Seulement sélectionnés
              </label>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">
                {selectedPersonas.length} sélectionné(s)
              </Badge>
              <Badge variant="outline">
                {jobData.personas.length} total
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Zone principale avec plus d'espace pour les cartes */}
      <Card className="flex-1">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredPersonas.map((persona) => {
              const isSelected = selectedPersonas.some(selected => selected.id === persona.id);
              
              return (
                <div
                  key={persona.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
                    isSelected 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => togglePersona(persona)}
                >
                  <div className="flex items-start gap-3">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => {}} // Handled by parent click
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <User className="h-4 w-4 text-gray-500" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-medium text-sm text-gray-900 truncate">
                            {persona.name}
                          </h4>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1 line-clamp-2">
                        {persona.title}
                      </p>
                      {persona.company && (
                        <p className="text-xs text-gray-500">
                          {persona.company}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredPersonas.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <Filter className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Aucun profil ne correspond aux critères de recherche</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
